#!/bin/bash

# SAP MCP Ordering System — Startup Script
# Gemma4 31B Cloud via Ollama · MCP Tools · Apple HIG × SAP Fiori UI

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

OLLAMA_MODEL="gemma4:31b-cloud"
DEFAULT_PORT="3000"
DEFAULT_HOST="localhost"
NODE_MIN_VERSION="18"
NPM_MIN_VERSION="8"

print_banner() {
  echo -e "${BLUE}"
  echo "╔══════════════════════════════════════════════╗"
  echo "║         SAP MCP Ordering System             ║"
  echo "║       AI-Powered Procurement Platform       ║"
  echo "║     Gemma4 31B Cloud · MCP · TypeScript     ║"
  echo "╚══════════════════════════════════════════════╝"
  echo -e "${NC}"
}

log_info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "${PURPLE}[STEP]${NC} $1"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

check_node_version() {
  if ! command_exists node; then
    log_error "Node.js is not installed!"
    log_info "Install from https://nodejs.org/ (v${NODE_MIN_VERSION}+)"
    exit 1
  fi
  local v
  v=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$v" -lt "$NODE_MIN_VERSION" ]; then
    log_error "Node.js $v is too old — need $NODE_MIN_VERSION+"
    exit 1
  fi
  log_success "Node.js $(node -v) ✓"
}

check_npm_version() {
  if ! command_exists npm; then
    log_error "npm not found"
    exit 1
  fi
  local v
  v=$(npm -v | cut -d. -f1)
  if [ "$v" -lt "$NPM_MIN_VERSION" ]; then
    log_error "npm $v is too old — need $NPM_MIN_VERSION+"
    exit 1
  fi
  log_success "npm $(npm -v) ✓"
}

check_ollama() {
  log_step "Checking Ollama..."
  if ! command_exists ollama; then
    log_error "Ollama not installed!"
    echo -e "${YELLOW}  macOS/Linux:${NC} curl -fsSL https://ollama.ai/install.sh | sh"
    echo -e "${YELLOW}  Windows:${NC}     https://ollama.ai/download"
    exit 1
  fi
  log_success "Ollama installed ✓"
}

check_ollama_service() {
  log_step "Checking Ollama service..."
  if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    log_warning "Ollama not running — attempting to start..."
    ollama serve &>/dev/null &
    sleep 4
    if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
      log_error "Could not start Ollama. Run 'ollama serve' manually."
      exit 1
    fi
  fi
  log_success "Ollama service running ✓"
}

check_cloud_auth() {
  log_step "Checking Ollama cloud authentication..."
  # Probe the cloud model — 401 means not signed in
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"${OLLAMA_MODEL}\",\"prompt\":\"\",\"stream\":false}" 2>/dev/null || echo "000")

  if [ "$http_code" = "401" ]; then
    log_warning "Not signed in to Ollama cloud."
    echo ""
    echo -e "${YELLOW}  Run this command to sign in:${NC}"
    echo -e "    ollama signin"
    echo ""
    echo -e "  A browser URL will appear — open it to authenticate."
    echo -e "  After signing in, re-run this script."
    echo ""
    read -p "Sign in now? This script will run 'ollama signin' (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      ollama signin
      log_success "Sign-in complete — restarting checks..."
    else
      log_warning "Skipping cloud auth — AI features will be limited."
    fi
  elif [ "$http_code" = "200" ] || [ "$http_code" = "404" ]; then
    # 404 = model not pulled but auth is fine; 200 = fully ready
    log_success "Ollama cloud auth OK ✓"
  else
    log_warning "Could not verify cloud auth (HTTP $http_code) — continuing anyway."
  fi
}

install_dependencies() {
  log_step "Installing dependencies..."
  if [ ! -f "package.json" ]; then
    log_error "package.json not found — run from project root"
    exit 1
  fi
  npm install --silent
  log_success "Dependencies installed ✓"
}

build_typescript() {
  log_step "Building TypeScript..."
  if [ ! -f "tsconfig.json" ]; then
    log_error "tsconfig.json not found"
    exit 1
  fi
  ./node_modules/.bin/tsc
  log_success "TypeScript compiled ✓"
}

setup_environment() {
  log_step "Setting up environment..."
  if [ ! -f ".env" ]; then
    cat > .env << EOF
NODE_ENV=development
PORT=${DEFAULT_PORT}
HOST=${DEFAULT_HOST}
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=${OLLAMA_MODEL}
EOF
    log_success ".env created ✓"
  else
    log_success ".env exists ✓"
  fi
}

check_port() {
  local port="${1:-$DEFAULT_PORT}"
  if command_exists netstat; then
    if netstat -tuln 2>/dev/null | grep -q ":${port} "; then
      log_warning "Port $port is in use"
      read -p "Continue anyway? (y/N): " -n 1 -r; echo
      [[ $REPLY =~ ^[Yy]$ ]] || exit 1
    fi
  fi
}

start_application() {
  log_step "Starting SAP MCP Ordering System..."
  local port="${PORT:-$DEFAULT_PORT}"
  local host="${HOST:-$DEFAULT_HOST}"
  check_port "$port"
  echo ""
  log_info "Server: http://$host:$port"
  log_info "Press Ctrl+C to stop"
  echo ""
  ./node_modules/.bin/tsx server.ts
}

start_development() {
  log_step "Starting in development mode (auto-reload)..."
  ./node_modules/.bin/nodemon --exec ./node_modules/.bin/tsx server.ts
}

health_check() {
  local port="${PORT:-$DEFAULT_PORT}"
  local host="${HOST:-$DEFAULT_HOST}"
  local tries=10 i=1
  while [ $i -le $tries ]; do
    if curl -s "http://$host:$port/api/health" >/dev/null 2>&1; then
      log_success "System healthy ✓"
      log_info "Frontend:     http://$host:$port"
      log_info "Health check: http://$host:$port/api/health"
      return 0
    fi
    log_info "Waiting... ($i/$tries)"
    sleep 2
    ((i++))
  done
  log_warning "Health check timed out — server may still be starting"
}

clean_build() {
  log_step "Cleaning build output..."
  rm -f public/*.js public/*.js.map public/*.d.ts public/*.d.ts.map
  log_success "Cleaned ✓"
}

run_system_checks() {
  check_node_version
  check_npm_version
  check_ollama
  check_ollama_service
  check_cloud_auth
  log_success "All system checks passed ✓"
}

show_usage() {
  echo -e "${BLUE}Usage:${NC} $0 [OPTION]"
  echo ""
  echo -e "${BLUE}Options:${NC}"
  echo "  start, run      Build + start (default)"
  echo "  dev             Start with auto-reload (no build)"
  echo "  build           Compile TypeScript only"
  echo "  setup           Install deps + environment"
  echo "  check           Run system checks only"
  echo "  health          Check running app health"
  echo "  clean           Remove compiled JS"
  echo "  help            Show this message"
  echo ""
  echo -e "${BLUE}Examples:${NC}"
  echo "  ./start.sh             # Normal start"
  echo "  ./start.sh dev         # Dev mode with hot reload"
  echo "  PORT=8080 ./start.sh   # Custom port"
}

main() {
  print_banner
  case "${1:-start}" in
    start|run|"")
      run_system_checks
      setup_environment
      install_dependencies
      build_typescript
      start_application
      ;;
    dev|development)
      run_system_checks
      setup_environment
      install_dependencies
      start_development
      ;;
    build)
      check_node_version
      check_npm_version
      install_dependencies
      build_typescript
      ;;
    setup)
      run_system_checks
      setup_environment
      install_dependencies
      ;;
    check)
      run_system_checks
      ;;
    health)
      health_check
      ;;
    clean)
      clean_build
      ;;
    help|-h|--help)
      show_usage
      ;;
    *)
      log_error "Unknown option: $1"
      echo ""
      show_usage
      exit 1
      ;;
  esac
}

trap 'echo -e "\n${YELLOW}Shutting down...${NC}"; exit 0' INT

main "$@"
