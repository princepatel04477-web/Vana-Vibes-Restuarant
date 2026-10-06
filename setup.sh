#!/usr/bin/env bash
# ==============================================================================
# Automated Project Setup & Bootstrap Wizard
# Supported Platforms: macOS, Linux (POSIX compliant)
# Changing .env.local automatically personalizes the whole project.
# ==============================================================================

set -e

# ANSI Color Codes
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

MIN_NODE_VERSION=20
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

get_app_name() {
    if [ -f ".env.local" ]; then
        grep -E '^NEXT_PUBLIC_APP_NAME=' .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "Application"
    elif [ -f ".env.example" ]; then
        grep -E '^NEXT_PUBLIC_APP_NAME=' .env.example | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "Application"
    else
        echo "Application"
    fi
}

print_header() {
    APP_NAME=$(get_app_name)
    APP_NAME_UPPER=$(echo "$APP_NAME" | tr '[:lower:]' '[:upper:]')
    echo -e "${CYAN}${BOLD}"
    echo "================================================================================"
    echo "            ${APP_NAME_UPPER} — FRONTEND BOOTSTRAP WIZARD                       "
    echo "================================================================================"
    echo -e "${RESET}"
    echo -e "Target Directory: ${BOLD}${SCRIPT_DIR}${RESET}"
    echo ""
}

print_step() {
    echo -e "${BLUE}${BOLD}[$1] $2${RESET}"
}

print_success() {
    echo -e "  ${GREEN}✓ $1${RESET}"
}

print_info() {
    echo -e "  ${CYAN}ℹ $1${RESET}"
}

print_warning() {
    echo -e "  ${YELLOW}⚠ $1${RESET}"
}

print_error() {
    echo -e "  ${RED}✗ $1${RESET}"
}

# ------------------------------------------------------------------------------
# [1/5] Check Node.js and Corepack/pnpm
# ------------------------------------------------------------------------------
check_runtime() {
    print_step "1/5" "Validating Node.js & pnpm runtime environment..."

    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js is not installed. Please install Node.js >= $MIN_NODE_VERSION."
        exit 1
    fi

    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

    if [ "$NODE_MAJOR" -lt "$MIN_NODE_VERSION" ]; then
        print_error "Node.js v$NODE_VERSION detected. Required: Node.js >= v$MIN_NODE_VERSION."
        exit 1
    fi
    print_success "Node.js v$NODE_VERSION detected (>= v$MIN_NODE_VERSION required)"

    if ! command -v pnpm >/dev/null 2>&1; then
        print_warning "pnpm not found in PATH. Activating corepack..."
        corepack enable
        corepack prepare pnpm@11.25.0 --activate
    fi

    PNPM_VERSION=$(pnpm -v)
    print_success "pnpm v$PNPM_VERSION detected"
}

# ------------------------------------------------------------------------------
# [2/5] Environment File Initialization
# ------------------------------------------------------------------------------
init_env() {
    print_step "2/5" "Checking local environment files (.env.local)..."
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            print_success "Created .env.local from template (.env.example)"
        else
            print_warning ".env.example not found; skipping .env.local initialization"
        fi
    else
        print_info ".env.local already configured"
    fi
}

# ------------------------------------------------------------------------------
# [3/5] Install Dependencies
# ------------------------------------------------------------------------------
install_deps() {
    print_step "3/5" "Installing project dependencies via pnpm..."
    pnpm install
    print_success "Dependencies installed successfully"
}

# ------------------------------------------------------------------------------
# [4/5] Configure Git Hooks
# ------------------------------------------------------------------------------
setup_git_hooks() {
    print_step "4/5" "Configuring Git pre-commit hooks..."
    if [ -d ".git" ]; then
        if [ -f ".githooks/pre-commit" ]; then
            chmod +x .githooks/pre-commit
            git config core.hooksPath .githooks
            print_success "Git hooksPath configured to .githooks (security + test gate active)"
        fi
    else
        print_info "Not a git repository; skipping git hooks setup"
    fi
}

# ------------------------------------------------------------------------------
# [5/5] Verification & Quality Gate
# ------------------------------------------------------------------------------
verify_quality() {
    print_step "5/5" "Running TypeScript, ESLint, and Vitest verification..."
    pnpm typecheck
    print_success "TypeScript typecheck passed (0 errors)"

    pnpm lint
    print_success "ESLint passed (0 errors, 0 warnings)"

    pnpm test
    print_success "Vitest continuous testing suite passed"
}

main() {
    init_env
    print_header
    check_runtime
    install_deps
    setup_git_hooks
    verify_quality

    APP_NAME=$(get_app_name)
    echo ""
    echo -e "${GREEN}${BOLD}================================================================================${RESET}"
    echo -e "${GREEN}${BOLD}  ✓ SETUP COMPLETE: ${APP_NAME} Frontend is Ready!                             ${RESET}"
    echo -e "${GREEN}${BOLD}================================================================================${RESET}"
    echo ""
    echo -e "Available commands:"
    echo -e "  ${CYAN}pnpm dev${RESET}        - Start local development server on http://localhost:3000"
    echo -e "  ${CYAN}pnpm test${RESET}       - Run automated Vitest test suite"
    echo -e "  ${CYAN}pnpm typecheck${RESET}  - Validate strict TypeScript compilation"
    echo -e "  ${CYAN}pnpm lint${RESET}       - Run ESLint checks"
    echo -e "  ${CYAN}pnpm build${RESET}      - Compile Next.js 16 standalone production bundle"
    echo -e "  ${CYAN}docker compose up --build${RESET} - Launch production Docker container"
    echo ""
}

main "$@"
