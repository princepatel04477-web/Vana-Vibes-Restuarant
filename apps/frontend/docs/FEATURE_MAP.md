# Van Vibes Frontend Feature-to-File Relationship Map

This document establishes the bidirectional mapping between user-facing capabilities, Next.js routes, feature modules, components, services, and backend API contracts.

---

## 1. Feature-to-Code Mapping Matrix

| Feature Domain | Capability & User Experience | Next.js Route(s) | Primary Feature Components | Hooks & Context | Services & API Endpoints | Backend Contract (:9000) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Table & QR Session** | • Mobile QR standee scan<br/>• Security token validation<br/>• Table binding & active session attach<br/>• Active session recovery | `/cafe/[cafeId]/menu`<br/>`/cafe/van-vibes/menu`<br/>`/cafe/vaan-vibes/menu`<br/>`/menu`<br/>`/` | `MenuClient.tsx`<br/>`CafeHeader.tsx`<br/>`TableHeaderPill.tsx` | `useTableSession`<br/>`CartContext` | `tableService`<br/>`POST /api/qr/validate`<br/>`GET /api/tables` | `POST /api/v1/tables/validate-qr`<br/>`GET /api/v1/tables` |
| **Menu Catalog & Browsing** | • Food item catalog browsing<br/>• Sticky category horizontal scroller<br/>• Veg / Non-Veg / Vegan filters<br/>• Spice level and badge indicators<br/>• Out-of-stock (86) indicators | `/cafe/[cafeId]/menu`<br/>`/cafe/van-vibes/menu`<br/>`/menu` | `CategoryNav.tsx`<br/>`FoodCard.tsx`<br/>`ItemCustomizationModal.tsx` | `useMenuFilter`<br/>`useMenu` | `menuService`<br/>`GET /api/menu` | `GET /api/v1/menu`<br/>`GET /api/v1/categories` |
| **Instant Menu Search** | • Overlay fuzzy search modal<br/>• Instant keyword highlighting<br/>• Direct Add to Cart from search | Overlay across all menu pages | `SearchModal.tsx` | `useMenuSearch`<br/>`CartContext` | In-memory index over canonical menu catalog | Local / cached catalog |
| **Cart & Guest Checkout** | • Slide-over cart drawer<br/>• Quantity increment/decrement<br/>• Customizations display<br/>• Special kitchen instructions<br/>• Customer name & phone input<br/>• Authoritative total calculation | Overlay across all menu pages | `CartDrawer.tsx`<br/>`CartItemList.tsx`<br/>`CustomerForm.tsx` | `useCart`<br/>`CartContext` | `CartContext` local storage sync (`vv_cart`) | Evaluated on order placement |
| **Order Placement & Confirmation** | • Atomic order submission<br/>• Multi-order per table session support<br/>• Confetti celebration modal<br/>• Order summary receipt preview | Modal overlay | `OrderConfirmationModal.tsx` | `useCart`<br/>`useOrderPlacement` | `orderService`<br/>`POST /api/orders` | `POST /api/v1/orders` (201 Created) |
| **Real-Time Order Tracking** | • Live 5-stage status progress (Placed -> Preparing -> Ready -> Served)<br/>• Polling fallback & WebSocket listener<br/>• Order cancellation (within grace window)<br/>• Consolidated session bill receipt viewer | Modal overlay (`isOrdersOpen`) | `OrderTrackingModal.tsx`<br/>`ConfirmationModal.tsx`<br/>`PrintableReceipt.tsx` | `useOrderTracking`<br/>`useCart` | `orderService`<br/>`GET /api/orders`<br/>`POST /api/orders/[id]/cancel`<br/>`GET /api/billing/[orderId]` | `GET /api/v1/orders`<br/>`POST /api/v1/orders/{id}/cancel`<br/>`GET /api/v1/billing/{order_id}` |
| **Cafe Branding & Info** | • Cafe logo, Hindi/English branding<br/>• Operating hours, address, phone<br/>• Table number badge<br/>• Quick action triggers | Header across all menu pages | `CafeHeader.tsx` | `CartContext` | `SiteConfig`<br/>`CAFE_INFO` | Static configuration |

---

## 2. Reusable UI Primitives (`src/components/ui/`)

| Component | Responsibility | Props Interface | Usages |
| :--- | :--- | :--- | :--- |
| **`ConfirmationModal.tsx`** | Accessible confirmation dialog for destructive actions (clear cart, cancel order) | `ConfirmationModalProps` (`isOpen`, `title`, `message`, `confirmText`, `onConfirm`, `onClose`) | CartDrawer, OrderTrackingModal |
| **`ScrollReveal.tsx`** | Performance-friendly IntersectionObserver animation wrapper | `ScrollRevealProps` (`children`, `direction`, `delay`, `distance`, `duration`) | MenuClient, FoodCard |
| **`Spinner.tsx`** | Standard branded loading spinner with customizable sizing and color | `SpinnerProps` (`size`, `className`) | Route loading fallbacks, async buttons |

---

## 3. Core Data Flow & State Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Idle: Customer loads page
    Idle --> ValidatingQR: Query params ?table=T01&token=... detected
    ValidatingQR --> SessionActive: Token verified by backend
    ValidatingQR --> InvalidToken: Invalid token or table inactive
    InvalidToken --> Idle: Display error banner
    
    SessionActive --> Browsing: Customer views menu catalog
    Browsing --> CartActive: Customer adds item to cart
    CartActive --> Customizing: Item has options (size, spice)
    Customizing --> CartActive: Customizations saved to item
    
    CartActive --> SubmittingOrder: Customer clicks "Place Order"
    SubmittingOrder --> OrderPlaced: 201 Created response
    OrderPlaced --> Tracking: Confetti modal -> Order tracker opened
    
    state Tracking {
        [*] --> PLACED
        PLACED --> ACCEPTED: Chef accepts
        ACCEPTED --> PREPARING: Kitchen starts prep
        PREPARING --> READY: Food ready for pickup
        READY --> SERVED: Delivered to table
        PLACED --> CANCELLED: Customer cancels before accept
    }
    
    Tracking --> BillReady: All orders served
    BillReady --> SettlePOS: Cash/UPI settled at billing counter
    SettlePOS --> [*]: Table released to AVAILABLE
```
