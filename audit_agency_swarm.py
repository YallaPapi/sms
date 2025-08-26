#!/usr/bin/env python3
"""
SMS Platform Code Audit Agency Swarm
===================================

Specialized audit agents with tools to thoroughly examine all code for:
- Placeholder data and TODO comments
- Syntax errors and bugs
- Security vulnerabilities 
- Code quality issues
- Performance problems
- Missing implementations
"""

import os
import subprocess
from agency_swarm import Agency, Agent
from agency_swarm.tools import BaseTool
from pydantic import Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
os.environ["OPENAI_API_KEY"] = os.getenv('OPENAI_API_KEY')

# Audit Tools
class FileAnalyzer(BaseTool):
    """Analyze files for code quality, placeholders, and issues."""
    file_path: str = Field(..., description="Path to file to analyze")
    
    def run(self):
        try:
            with open(self.file_path, 'r') as file:
                content = file.read()
            
            # Check for common issues
            issues = []
            lines = content.split('\n')
            
            for i, line in enumerate(lines, 1):
                line_lower = line.lower()
                
                # Check for placeholder content
                if any(keyword in line_lower for keyword in ['todo', 'fixme', 'placeholder', 'demo data', 'fake', 'mock', 'temporary', 'temp']):
                    issues.append(f"Line {i}: Placeholder content found: {line.strip()}")
                
                # Check for empty implementations
                if 'pass' in line and not line.strip().startswith('#'):
                    issues.append(f"Line {i}: Empty implementation with 'pass': {line.strip()}")
                
                # Check for console.log in production
                if 'console.log' in line_lower:
                    issues.append(f"Line {i}: Console.log found (remove for production): {line.strip()}")
                
                # Check for hardcoded values
                if any(keyword in line_lower for keyword in ['localhost', '127.0.0.1', 'password123', 'admin']):
                    issues.append(f"Line {i}: Hardcoded value found: {line.strip()}")
            
            if not issues:
                return f"OK {self.file_path}: No major issues found"
            else:
                return f"ISSUES {self.file_path}:\n" + "\n".join(issues)
                
        except Exception as e:
            return f"Error analyzing {self.file_path}: {str(e)}"

class SecurityScanner(BaseTool):
    """Scan code for security vulnerabilities."""
    file_path: str = Field(..., description="Path to file to scan for security issues")
    
    def run(self):
        try:
            with open(self.file_path, 'r') as file:
                content = file.read()
            
            security_issues = []
            lines = content.split('\n')
            
            for i, line in enumerate(lines, 1):
                line_lower = line.lower()
                
                # SQL injection risks
                if 'select' in line_lower and ('${' in line or '{' in line or '+' in line):
                    security_issues.append(f"Line {i}: Potential SQL injection risk: {line.strip()}")
                
                # Hardcoded secrets
                if any(keyword in line_lower for keyword in ['api_key', 'secret', 'password', 'token']) and '=' in line:
                    if not line.strip().startswith('#') and not 'getenv' in line_lower:
                        security_issues.append(f"Line {i}: Potential hardcoded secret: {line.strip()}")
                
                # Unsafe eval/exec
                if any(func in line_lower for func in ['eval(', 'exec(', 'system(', 'shell_exec']):
                    security_issues.append(f"Line {i}: Unsafe code execution: {line.strip()}")
                
                # Missing input validation
                if 'req.body' in line and 'validate' not in line_lower and 'sanitize' not in line_lower:
                    security_issues.append(f"Line {i}: Potential missing input validation: {line.strip()}")
            
            if not security_issues:
                return f"SECURE {self.file_path}: No security issues found"
            else:
                return f"SECURITY ALERT {self.file_path} SECURITY ISSUES:\n" + "\n".join(security_issues)
                
        except Exception as e:
            return f"Error scanning {self.file_path}: {str(e)}"

class SyntaxChecker(BaseTool):
    """Check syntax and run linting on code files."""
    file_path: str = Field(..., description="Path to file to check syntax")
    
    def run(self):
        try:
            file_ext = os.path.splitext(self.file_path)[1].lower()
            
            if file_ext == '.ts' or file_ext == '.tsx':
                # TypeScript syntax check
                result = subprocess.run(['npx', 'tsc', '--noEmit', self.file_path], 
                                      capture_output=True, text=True, cwd=os.path.dirname(self.file_path))
                if result.returncode != 0:
                    return f"ERROR {self.file_path} TypeScript errors:\n{result.stderr}"
                else:
                    return f"OK {self.file_path}: TypeScript syntax OK"
            
            elif file_ext == '.js' or file_ext == '.jsx':
                # JavaScript syntax check with node
                result = subprocess.run(['node', '--check', self.file_path], 
                                      capture_output=True, text=True)
                if result.returncode != 0:
                    return f"ERROR {self.file_path} JavaScript errors:\n{result.stderr}"
                else:
                    return f"OK {self.file_path}: JavaScript syntax OK"
            
            elif file_ext == '.py':
                # Python syntax check
                result = subprocess.run(['python', '-m', 'py_compile', self.file_path], 
                                      capture_output=True, text=True)
                if result.returncode != 0:
                    return f"ERROR {self.file_path} Python errors:\n{result.stderr}"
                else:
                    return f"OK {self.file_path}: Python syntax OK"
            
            else:
                return f"INFO {self.file_path}: Syntax check not available for {file_ext}"
                
        except Exception as e:
            return f"Error checking syntax for {self.file_path}: {str(e)}"

class CodeQualityAnalyzer(BaseTool):
    """Analyze code quality, complexity, and best practices."""
    file_path: str = Field(..., description="Path to file to analyze for code quality")
    
    def run(self):
        try:
            with open(self.file_path, 'r') as file:
                content = file.read()
            
            quality_issues = []
            lines = content.split('\n')
            
            # Function length analysis
            current_function_start = None
            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                
                # Detect function start
                if any(keyword in stripped for keyword in ['function ', 'def ', 'const ', 'let ', 'var ']) and '{' in stripped or ':' in stripped:
                    current_function_start = i
                
                # Check for very long lines
                if len(line) > 120:
                    quality_issues.append(f"Line {i}: Line too long ({len(line)} chars): {line[:50]}...")
                
                # Check for nested complexity
                indent_level = len(line) - len(line.lstrip())
                if indent_level > 24:  # More than 6 levels of indentation
                    quality_issues.append(f"Line {i}: High nesting complexity")
                
                # Check for magic numbers
                if any(char.isdigit() for char in stripped) and not stripped.startswith('#'):
                    numbers = [int(s) for s in stripped.split() if s.isdigit() and int(s) > 1]
                    if numbers and max(numbers) > 100:
                        quality_issues.append(f"Line {i}: Magic number found: {max(numbers)}")
            
            # Check for missing error handling
            has_try_catch = 'try' in content.lower() and 'catch' in content.lower()
            has_error_handling = 'error' in content.lower() or 'exception' in content.lower()
            
            if not has_try_catch and not has_error_handling:
                quality_issues.append("Missing error handling - no try/catch or error handling found")
            
            if not quality_issues:
                return f"OK {self.file_path}: Code quality looks good"
            else:
                return f"WARNING {self.file_path} Quality Issues:\n" + "\n".join(quality_issues)
                
        except Exception as e:
            return f"Error analyzing quality for {self.file_path}: {str(e)}"

class DependencyChecker(BaseTool):
    """Check package.json dependencies for vulnerabilities and issues."""
    file_path: str = Field(..., description="Path to package.json file")
    
    def run(self):
        try:
            import json
            with open(self.file_path, 'r') as file:
                package_data = json.load(file)
            
            issues = []
            
            # Check for missing scripts
            scripts = package_data.get('scripts', {})
            required_scripts = ['start', 'test', 'build']
            
            for script in required_scripts:
                if script not in scripts:
                    issues.append(f"Missing required script: {script}")
            
            # Check dependencies
            dependencies = package_data.get('dependencies', {})
            dev_dependencies = package_data.get('devDependencies', {})
            
            # Check for outdated versions (basic check)
            for dep, version in dependencies.items():
                if version.startswith('^'):
                    major_version = version[1:].split('.')[0]
                    if major_version.isdigit() and int(major_version) < 1:
                        issues.append(f"Dependency {dep} version {version} may be outdated")
            
            if not issues:
                return f"OK {self.file_path}: Package dependencies look good"
            else:
                return f"WARNING {self.file_path} Dependency Issues:\n" + "\n".join(issues)
                
        except Exception as e:
            return f"Error checking dependencies in {self.file_path}: {str(e)}"

class DirectoryScanner(BaseTool):
    """Scan directories for files to audit."""
    directory_path: str = Field(..., description="Path to directory to scan")
    
    def run(self):
        try:
            files_found = []
            for root, dirs, files in os.walk(self.directory_path):
                for file in files:
                    if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.py', '.json')):
                        full_path = os.path.join(root, file)
                        files_found.append(full_path)
            
            return f"Found {len(files_found)} files to audit:\n" + "\n".join(files_found)
            
        except Exception as e:
            return f"Error scanning directory {self.directory_path}: {str(e)}"

# Create Audit Agents
placeholder_hunter = Agent(
    name="PlaceholderHunter",
    description="Specialized agent to hunt down placeholder code, TODOs, and incomplete implementations",
    instructions="""You are a specialized code auditor focused on finding placeholder content.
    
    Your mission:
    1. Use FileAnalyzer to examine every code file
    2. Find ALL placeholder code, TODO comments, demo data, mock implementations
    3. Identify incomplete functions and empty implementations
    4. Report exact line numbers and content
    5. ZERO TOLERANCE for placeholder code in production
    
    Use DirectoryScanner first to find all files, then FileAnalyzer on each file.
    Report every single placeholder found with precise location.""",
    tools=[FileAnalyzer, DirectoryScanner],
)

security_auditor = Agent(
    name="SecurityAuditor", 
    description="Security specialist focused on finding vulnerabilities and security issues",
    instructions="""You are a security auditing specialist.
    
    Your mission:
    1. Use SecurityScanner to examine all code files for security vulnerabilities
    2. Find SQL injection risks, hardcoded secrets, unsafe operations
    3. Check for missing input validation and sanitization
    4. Identify potential XSS and CSRF vulnerabilities
    5. Flag any security anti-patterns
    
    Scan every file systematically and report all security issues with severity levels.
    Focus on backend API routes, database queries, and user input handling.""",
    tools=[SecurityScanner, DirectoryScanner, FileAnalyzer],
)

syntax_validator = Agent(
    name="SyntaxValidator",
    description="Code syntax and compilation specialist",
    instructions="""You are a syntax validation specialist.
    
    Your mission:
    1. Use SyntaxChecker to validate syntax of all code files
    2. Run TypeScript/JavaScript compilation checks
    3. Verify Python syntax if any Python files exist
    4. Check for import/export errors
    5. Validate JSON configuration files
    
    Ensure every file can compile/execute without syntax errors.
    Report compilation failures and syntax issues immediately.""",
    tools=[SyntaxChecker, DirectoryScanner],
)

quality_inspector = Agent(
    name="QualityInspector",
    description="Code quality and best practices inspector", 
    instructions="""You are a code quality inspector focused on best practices.
    
    Your mission:
    1. Use CodeQualityAnalyzer to examine code quality issues
    2. Check for overly complex functions and high nesting
    3. Find magic numbers, long lines, poor naming
    4. Verify error handling is implemented
    5. Check for code duplication and anti-patterns
    
    Analyze every file for maintainability and readability issues.
    Report quality violations that could cause maintenance problems.""",
    tools=[CodeQualityAnalyzer, DirectoryScanner, FileAnalyzer],
)

dependency_auditor = Agent(
    name="DependencyAuditor",
    description="Package dependency and configuration auditor",
    instructions="""You are a dependency and configuration auditor.
    
    Your mission:
    1. Use DependencyChecker to audit all package.json files
    2. Check for missing required scripts (start, test, build)
    3. Identify vulnerable or outdated dependencies
    4. Verify configuration files are complete
    5. Check for missing development dependencies
    
    Examine all package.json, tsconfig.json, and configuration files.
    Report missing dependencies and configuration issues.""",
    tools=[DependencyChecker, DirectoryScanner, FileAnalyzer],
)

audit_coordinator = Agent(
    name="AuditCoordinator",
    description="Master auditor that coordinates all audit activities and compiles final report",
    instructions="""You are the master audit coordinator.
    
    Your mission:
    1. Coordinate all audit agents to examine the SMS platform project
    2. Collect reports from all specialized auditors
    3. Compile a comprehensive audit report
    4. Prioritize issues by severity (Critical, High, Medium, Low)
    5. Provide actionable recommendations for fixes
    
    Direct other agents to audit specific components:
    - Backend code in backend/ directory
    - Frontend code in frontend/ directory  
    - Device integration in device/ directory
    - Mobile code in mobile/ directory
    - Configuration and dependency files
    
    Generate a final executive summary of all findings.""",
    tools=[DirectoryScanner, FileAnalyzer, SecurityScanner, SyntaxChecker, CodeQualityAnalyzer, DependencyChecker],
)

# Create Audit Agency
audit_agency = Agency(
    audit_coordinator,
    placeholder_hunter,
    security_auditor, 
    syntax_validator,
    quality_inspector,
    dependency_auditor,
    shared_instructions="""
    COMPREHENSIVE CODE AUDIT MISSION
    
    Target: SMS Drip Campaign Platform - Complete codebase audit
    
    Audit Scope:
    - All backend code (Node.js/TypeScript/Express)
    - All frontend code (React/TypeScript)
    - Device integration code (WebUSB/TypeScript)
    - Mobile app code (React Native)
    - Configuration files (package.json, tsconfig.json)
    - Database models and migrations
    
    CRITICAL REQUIREMENTS:
    1. ZERO TOLERANCE for placeholder code, TODOs, or incomplete implementations
    2. Find ALL security vulnerabilities and risks
    3. Validate ALL code compiles and runs without errors
    4. Check ALL dependencies and configurations
    5. Verify production readiness of entire codebase
    
    Severity Levels:
    - CRITICAL: Security vulnerabilities, syntax errors, broken code
    - HIGH: Placeholder code, missing implementations, major quality issues
    - MEDIUM: Code quality issues, minor security concerns
    - LOW: Style issues, optimization opportunities
    
    Report Format:
    - List all issues with file paths and line numbers
    - Provide severity classification
    - Give specific fix recommendations
    - Include executive summary
    """
)

def run_comprehensive_audit():
    """Run comprehensive audit of the SMS platform codebase."""
    
    print("SMS PLATFORM COMPREHENSIVE CODE AUDIT")
    print("Deploying specialized audit agents...")
    print("=" * 60)
    
    try:
        audit_command = """
        AUDIT DIRECTIVE: COMPREHENSIVE CODEBASE AUDIT
        
        AuditCoordinator: Direct all audit agents to examine the SMS platform codebase.
        
        IMMEDIATE ACTIONS:
        
        1. PlaceholderHunter: Scan ALL directories for placeholder code, TODOs, incomplete implementations
        2. SecurityAuditor: Examine ALL code for security vulnerabilities and risks  
        3. SyntaxValidator: Validate syntax and compilation of ALL TypeScript/JavaScript files
        4. QualityInspector: Analyze code quality, complexity, and best practices
        5. DependencyAuditor: Audit ALL package.json and configuration files
        
        SCAN THESE DIRECTORIES THOROUGHLY:
        - backend/ (Node.js/Express server)
        - frontend/ (React dashboard) 
        - device/ (WebUSB integration)
        - mobile/ (React Native apps)
        - Root configuration files
        
        FIND EVERY ISSUE:
        - Placeholder code and TODOs
        - Security vulnerabilities
        - Syntax errors and compilation failures
        - Code quality problems
        - Missing dependencies
        - Configuration issues
        
        Generate comprehensive audit report with severity levels and fix recommendations.
        
        START AUDIT NOW.
        """
        
        print("Starting comprehensive audit...")
        response = audit_agency.get_completion(audit_command)
        
        print("\n" + "=" * 60)
        print("COMPREHENSIVE AUDIT REPORT:")
        print("=" * 60)
        print(response)
        
        return audit_agency, response
        
    except Exception as e:
        print(f"ERROR Audit Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, str(e)

if __name__ == "__main__":
    print("DEPLOYING SMS PLATFORM AUDIT AGENCY")
    print("Specialized agents: Placeholder Hunter, Security Auditor, Syntax Validator, Quality Inspector, Dependency Auditor")
    print()
    
    # Run comprehensive audit
    audit_instance, audit_report = run_comprehensive_audit()
    
    if audit_instance:
        print("\nOK Audit completed successfully!")
        print("Review the findings above for all issues found.")
        
        # Interactive mode for follow-up questions
        try:
            print("\nAudit agency ready for additional commands...")
            print("Type 'reaudit <directory>' for specific directory audit, 'exit' to stop")
            
            while True:
                user_input = input("\nAudit Command: ").strip()
                
                if user_input.lower() == 'exit':
                    break
                elif user_input.startswith('reaudit'):
                    directory = user_input.replace('reaudit', '').strip()
                    if directory:
                        response = audit_instance.get_completion(f"Re-audit the {directory} directory for any issues missed in the initial scan")
                        print(f"\nRe-audit Results:\n{response}")
                elif user_input:
                    print("\nProcessing...")
                    response = audit_instance.get_completion(user_input)
                    print(f"\nAudit Response:\n{response}")
                    
        except KeyboardInterrupt:
            print("\n\nAudit agency stopped")
            
    else:
        print(f"\nERROR Audit failed: {audit_report}")