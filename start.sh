#!/bin/bash

# SAP MCP Ordering System - Startup Script
# Comprehensive setup and launch script for US English TypeScript version

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="SAP MCP Ordering System"
NODE_MIN_VERSION="18"
NPM_MIN_VERSION="8"
OLLAMA_MODEL="qwen:1.8b"
DEFAULT_PORT="3000"
DEFAULT_HOST="localhost"

# Display banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║          SAP MCP Ordering System            ║"
    echo "║        AI-Powered Procurement Platform      ║"
    echo "║         TypeScript + Qwen 3:1.7b           ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Logging functions
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js version
check_node_version() {
    if ! command_exists node; then
        log_error "Node.js is not installed!"
        log_info "Please install Node.js version $NODE_MIN_VERSION or higher from https://nodejs.org/"
        exit 1
    fi

    local node_version=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$node_version" -lt "$NODE_MIN_VERSION" ]; then
        log_error "Node.js version $node_version is too old!"
        log_info "Please upgrade to Node.js version $NODE_MIN_VERSION or higher"
        exit 1
    fi

    log_success "Node.js version $(node -v) ✓"
}

# Check npm version
check_npm_version() {
    if ! command_exists npm; then
        log_error "npm is not installed!"
        exit 1
    fi

    local npm_version=$(npm -v | cut -d. -f1)
    if [ "$npm_version" -lt "$NPM_MIN_VERSION" ]; then
        log_error "npm version $npm_version is too old!"
        log_info "Please upgrade npm with: npm install -g npm@latest"
        exit 1
    fi

    log_success "npm version $(npm -v) ✓"
}

# Check TypeScript
check_typescript() {
    if ! command_exists tsc; then
        log_warning "TypeScript compiler not found globally"
        log_info "Installing TypeScript locally..."
        npm install --save-dev typescript
    else
        log_success "TypeScript $(tsc -v | cut -d' ' -f2) ✓"
    fi
}

# Check Ollama installation
check_ollama() {
    log_step "Checking Ollama installation..."
    
    if ! command_exists ollama; then
        log_error "Ollama is not installed!"
        log_info "Please install Ollama:"
        echo -e "${YELLOW}  macOS/Linux: ${NC}curl -fsSL https://ollama.ai/install.sh | sh"
        echo -e "${YELLOW}  Windows: ${NC}Download from https://ollama.ai/download"
        echo ""
        log_info "After installation, run this script again."
        exit 1
    fi

    log_success "Ollama is installed ✓"
}

# Check if Ollama is running
check_ollama_service() {
    log_step "Checking Ollama service..."
    
    if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        log_warning "Ollama service is not running!"
        log_info "Starting Ollama service..."
        
        # Try to start Ollama in background
        if command_exists systemctl; then
            # Linux with systemd
            if systemctl is-active --quiet ollama; then
                log_success "Ollama service is already running ✓"
            else
                log_info "Starting Ollama service with systemctl..."
                sudo systemctl start ollama || {
                    log_warning "Failed to start with systemctl, trying manual start..."
                    ollama serve &
                    sleep 3
                }
            fi
        else
            # macOS or manual start
            log_info "Starting Ollama manually..."
            ollama serve &
            sleep 5
            
            # Check if it started successfully
            if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
                log_error "Failed to start Ollama service!"
                log_info "Please start Ollama manually with: ollama serve"
                exit 1
            fi
        fi
    fi

    log_success "Ollama service is running ✓"
}

# Check and install Qwen model
check_qwen_model() {
    log_step "Checking Qwen 3:1.7b model..."
    
    if ! ollama list | grep -q "$OLLAMA_MODEL"; then
        log_warning "Qwen 3:1.7b model not found!"
        log_info "Installing Qwen 3:1.7b model (this may take a while)..."
        
        if ! ollama pull "$OLLAMA_MODEL"; then
            log_error "Failed to install Qwen model!"
            log_info "Please install manually with: ollama pull $OLLAMA_MODEL"
            exit 1
        fi
    fi

    log_success "Qwen 3:1.7b model is available ✓"
}

# Test Qwen model
test_qwen_model() {
    log_step "Testing Qwen model..."
    
    local test_response=$(ollama generate qwen:1.8b "Hello, respond with 'OK'" 2>/dev/null | head -n1)
    
    if [[ "$test_response" == *"OK"* ]] || [[ "$test_response" == *"ok"* ]]; then
        log_success "Qwen model is working correctly ✓"
    else
        log_warning "Qwen model test returned unexpected response: $test_response"
        log_info "Model is installed but may need warming up..."
    fi
}

# Install dependencies
install_dependencies() {
    log_step "Installing project dependencies..."
    
    if [ ! -f "package.json" ]; then
        log_error "package.json not found! Are you in the correct directory?"
        exit 1
    fi

    log_info "Running npm install..."
    if ! npm install; then
        log_error "Failed to install dependencies!"
        exit 1
    fi

    log_success "Dependencies installed ✓"
}

# Build TypeScript
build_typescript() {
    log_step "Building TypeScript project..."
    
    if [ ! -f "tsconfig.json" ]; then
        log_error "tsconfig.json not found!"
        exit 1
    fi

    log_info "Compiling TypeScript to JavaScript..."
    if ! npm run build; then
        log_error "TypeScript compilation failed!"
        log_info "Check your TypeScript files for errors"
        exit 1
    fi

    log_success "TypeScript compiled successfully ✓"
}

# Setup environment
setup_environment() {
    log_step "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        log_info "Creating .env file..."
        cat > .env << EOF
# SAP MCP Ordering System Configuration
NODE_ENV=development
PORT=${DEFAULT_PORT}
HOST=${DEFAULT_HOST}
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=${OLLAMA_MODEL}
MCP_ENDPOINT=ws://localhost:8080/mcp
DEBUG=false
EOF
        log_success "Environment file created ✓"
    else
        log_success "Environment file exists ✓"
    fi
}

# Check port availability
check_port() {
    local port=${1:-$DEFAULT_PORT}
    
    if command_exists netstat; then
        if netstat -tuln | grep -q ":$port "; then
            log_warning "Port $port is already in use!"
            log_info "The application might already be running, or another service is using this port."
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    elif command_exists lsof; then
        if lsof -ti:$port >/dev/null 2>&1; then
            log_warning "Port $port is already in use!"
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
}

# Start the application
start_application() {
    log_step "Starting SAP MCP Ordering System..."
    
    local port=${PORT:-$DEFAULT_PORT}
    local host=${HOST:-$DEFAULT_HOST}
    
    check_port "$port"
    
    log_info "Starting server on http://$host:$port"
    log_info "Press Ctrl+C to stop the server"
    echo ""
    
    # Start with npm script (handles TypeScript compilation)
    if ! npm start; then
        log_error "Failed to start the application!"
        log_info "Check the logs above for error details"
        exit 1
    fi
}

# Development mode
start_development() {
    log_step "Starting in development mode..."
    
    if ! command_exists nodemon; then
        log_info "Installing nodemon for development..."
        npm install --save-dev nodemon
    fi
    
    log_info "Starting development server with auto-reload..."
    npm run dev
}

# Health check
health_check() {
    log_step "Performing system health check..."
    
    local port=${PORT:-$DEFAULT_PORT}
    local host=${HOST:-$DEFAULT_HOST}
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://$host:$port/api/health" >/dev/null 2>&1; then
            log_success "Application is healthy and responding ✓"
            log_info "Frontend: http://$host:$port"
            log_info "Health Check: http://$host:$port/api/health"
            return 0
        fi
        
        log_info "Waiting for application to start... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    log_warning "Health check failed - application may still be starting"
    return 1
}

# Show usage
show_usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0 [OPTION]"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo "  start, run          Start the application (default)"
    echo "  dev, development    Start in development mode with auto-reload"
    echo "  build              Build TypeScript only"
    echo "  setup              Setup environment and dependencies only"
    echo "  check              Run system checks only"
    echo "  health             Check if running application is healthy"
    echo "  clean              Clean build files"
    echo "  help, -h, --help   Show this help message"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0                 # Start normally"
    echo "  $0 dev             # Start in development mode"
    echo "  $0 setup           # Setup only"
    echo "  PORT=8080 $0       # Start on custom port"
}

# Clean build files
clean_build() {
    log_step "Cleaning build files..."
    
    npm run clean 2>/dev/null || {
        log_info "Cleaning manually..."
        rm -rf dist/
        rm -f public/*.js public/*.js.map public/*.d.ts
    }
    
    log_success "Build files cleaned ✓"
}

# System checks
run_system_checks() {
    log_step "Running comprehensive system checks..."
    
    check_node_version
    check_npm_version
    check_typescript
    check_ollama
    check_ollama_service
    check_qwen_model
    test_qwen_model
    
    log_success "All system checks passed! 🎉"
}

# Main function
main() {
    print_banner
    
    case "${1:-start}" in
        "start"|"run"|"")
            run_system_checks
            setup_environment
            install_dependencies
            build_typescript
            start_application
            ;;
        "dev"|"development")
            run_system_checks
            setup_environment
            install_dependencies
            start_development
            ;;
        "build")
            check_node_version
            check_npm_version
            check_typescript
            install_dependencies
            build_typescript
            ;;
        "setup")
            run_system_checks
            setup_environment
            install_dependencies
            ;;
        "check")
            run_system_checks
            ;;
        "health")
            health_check
            ;;
        "clean")
            clean_build
            ;;
        "help"|"-h"|"--help")
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

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Shutting down...${NC}"; exit 0' INT

# Run main function
main "$@"
