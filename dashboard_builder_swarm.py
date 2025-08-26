#!/usr/bin/env python3
"""
Dashboard Builder Agency Swarm
=============================

Specialized agents to build the complete SMS campaign dashboard interface.
Each agent focuses on specific dashboard components with development tools.
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

# Reuse development tools from previous swarm
class FileWriter(BaseTool):
    """Write code or text to a file."""
    file_path: str = Field(..., description="Path where file should be written")
    content: str = Field(..., description="Content to write to the file")
    mode: str = Field(default="w", description="Write mode: 'w' for overwrite, 'a' for append")
    
    def run(self):
        try:
            os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
            with open(self.file_path, self.mode) as file:
                file.write(self.content)
            return f"Successfully wrote to {self.file_path}"
        except Exception as e:
            return f"Error writing file: {str(e)}"

class CommandExecutor(BaseTool):
    """Execute terminal commands."""
    command: str = Field(..., description="Command to execute")
    working_directory: str = Field(default=".", description="Working directory")
    
    def run(self):
        try:
            result = subprocess.run(
                self.command, shell=True, capture_output=True, 
                text=True, cwd=self.working_directory
            )
            if result.returncode == 0:
                return f"Command executed successfully:\n{result.stdout}"
            else:
                return f"Command failed:\n{result.stderr}"
        except Exception as e:
            return f"Execution error: {str(e)}"

class FileReader(BaseTool):
    """Read and examine file contents."""
    file_path: str = Field(..., description="Path to file to read")
    
    def run(self):
        try:
            with open(self.file_path, 'r') as file:
                content = file.read()
            return f"File content of {self.file_path}:\n{content}"
        except Exception as e:
            return f"Error reading file: {str(e)}"

# Dashboard Building Agents
dashboard_architect = Agent(
    name="DashboardArchitect",
    description="Dashboard architecture designer and main component coordinator",
    instructions="""You are the dashboard architect responsible for designing and coordinating the complete SMS campaign dashboard.

Your mission:
1. Design the overall dashboard structure and navigation
2. Create the main App.tsx with proper routing between pages
3. Set up the component architecture and shared utilities
4. Coordinate other agents to build specific components
5. Ensure consistent styling and user experience

Components to orchestrate:
- Device Management Dashboard
- Campaign Creation Interface  
- Live Campaign Monitor
- Analytics Dashboard
- Contact Management
- Message Templates

Use FileWriter to create:
- Updated App.tsx with full navigation
- Main dashboard layout components
- Routing configuration
- Shared utility functions
- CSS styling framework

Make it professional and production-ready with proper error handling.""",
    tools=[FileWriter, CommandExecutor, FileReader],
)

device_dashboard_agent = Agent(
    name="DeviceDashboardAgent",
    description="Device management dashboard specialist",
    instructions="""You are the device management dashboard specialist.

Your mission:
1. Build the Device Management page showing all connected phones
2. Create real-time device status display (battery, signal, SIM)
3. Build device connection interface for adding new phones
4. Create device testing and control interface
5. Show device statistics and performance metrics

Features to implement:
- Live device grid showing phone status
- Device connection wizard for USB/WiFi setup
- Individual device control panel
- Device performance charts
- Connection troubleshooting interface

Use FileWriter to create:
- DeviceManagement.tsx - main device dashboard
- DeviceCard.tsx - individual device display
- DeviceStats.tsx - device statistics
- AddDevice.tsx - device connection wizard
- WebSocket integration for real-time updates

Make it visually appealing with status indicators and real-time updates.""",
    tools=[FileWriter, CommandExecutor, FileReader],
)

campaign_builder_agent = Agent(
    name="CampaignBuilderAgent", 
    description="Campaign creation and management interface specialist",
    instructions="""You are the campaign creation specialist.

Your mission:
1. Build campaign creation interface with contact upload
2. Create message composition with variables and preview
3. Build campaign scheduling and delivery options
4. Create contact list management and validation
5. Build campaign templates and saved messages

Features to implement:
- Campaign creation wizard
- CSV contact upload with validation
- Message editor with variable insertion
- Campaign scheduling interface
- Contact list management
- Message template library
- Campaign preview before sending

Use FileWriter to create:
- CampaignBuilder.tsx - main campaign creation
- ContactUpload.tsx - CSV upload and validation  
- MessageEditor.tsx - message composition
- CampaignSchedule.tsx - scheduling options
- ContactManager.tsx - contact list management
- TemplateLibrary.tsx - saved message templates

Focus on user-friendly interface with drag-and-drop and previews.""",
    tools=[FileWriter, CommandExecutor, FileReader],
)

live_monitor_agent = Agent(
    name="LiveMonitorAgent",
    description="Real-time campaign monitoring dashboard specialist", 
    instructions="""You are the live campaign monitoring specialist.

Your mission:
1. Build real-time campaign progress monitoring
2. Create live message delivery tracking  
3. Build device performance monitoring during campaigns
4. Create delivery analytics and failure reporting
5. Build campaign control interface (pause/resume/stop)

Features to implement:
- Live campaign progress bars and statistics
- Real-time message delivery feed
- Device performance monitoring during sends
- Delivery success/failure analytics
- Campaign control buttons (pause/resume/stop)
- Message queue visualization per device
- Live charts and graphs

Use FileWriter to create:
- CampaignMonitor.tsx - main monitoring dashboard
- LiveProgress.tsx - real-time progress tracking
- DevicePerformance.tsx - device performance during campaign
- MessageFeed.tsx - live message delivery feed
- CampaignControls.tsx - pause/resume/stop controls
- DeliveryAnalytics.tsx - success/failure statistics

Make it dynamic with live updates, charts, and visual feedback.""",
    tools=[FileWriter, CommandExecutor, FileReader],
)

analytics_agent = Agent(
    name="AnalyticsAgent",
    description="Analytics dashboard and reporting specialist",
    instructions="""You are the analytics and reporting specialist.

Your mission:
1. Build comprehensive analytics dashboard
2. Create campaign performance reports
3. Build device utilization analytics  
4. Create delivery rate optimization insights
5. Build historical data visualization

Features to implement:
- Campaign performance analytics
- Device utilization reports  
- Delivery success rate tracking
- Response rate analytics (if applicable)
- Historical trend analysis
- Performance optimization recommendations
- Export reports functionality

Use FileWriter to create:
- Analytics.tsx - main analytics dashboard
- CampaignReports.tsx - campaign performance reports
- DeviceAnalytics.tsx - device utilization analytics
- DeliveryRates.tsx - delivery success tracking
- TrendAnalysis.tsx - historical trends
- ReportExport.tsx - export functionality

Include charts, graphs, and data visualization components.""",
    tools=[FileWriter, CommandExecutor, FileReader],
)

ui_designer_agent = Agent(
    name="UIDesignerAgent",
    description="UI design and styling specialist",
    instructions="""You are the UI design and styling specialist.

Your mission:
1. Create professional CSS styling for all components
2. Build responsive design that works on all screen sizes
3. Create consistent color scheme and branding
4. Build reusable UI components and design system
5. Ensure accessibility and user experience best practices

Design requirements:
- Professional business application look
- Consistent color scheme (blues/grays for business)
- Responsive design for desktop, tablet, mobile
- Clean, modern interface with good spacing
- Status indicators and visual feedback
- Loading states and error handling
- Icons and visual elements

Use FileWriter to create:
- styles/globals.css - main stylesheet
- components/UI/ - reusable UI components
- styles/components/ - component-specific styles
- design-system.css - design tokens and variables
- responsive.css - responsive design rules

Make it look professional like modern SaaS dashboards.""",
    tools=[FileWriter, CommandExecutor, FileReader],
)

# Create Dashboard Builder Agency
dashboard_agency = Agency(
    dashboard_architect,
    device_dashboard_agent,
    campaign_builder_agent, 
    live_monitor_agent,
    analytics_agent,
    ui_designer_agent,
    shared_instructions="""
    DASHBOARD BUILDER MISSION
    
    Target: Build complete SMS Campaign Platform web dashboard
    
    Dashboard Requirements:
    1. Device Management - View and control connected phones
    2. Campaign Creation - Upload contacts, compose messages, schedule sends
    3. Live Monitoring - Real-time campaign progress tracking
    4. Analytics - Performance reports and insights
    5. Professional UI - Clean, responsive, business-grade interface
    
    Technical Stack:
    - React with TypeScript
    - WebSocket for real-time updates
    - CSS for styling (no external frameworks initially)
    - Responsive design for all devices
    
    CRITICAL REQUIREMENTS:
    1. NO placeholder components - everything must be functional
    2. Real API integration with existing backend
    3. Professional business application appearance
    4. Responsive design for desktop/tablet/mobile
    5. Real-time updates via WebSocket
    6. Proper error handling and loading states
    
    File Structure:
    frontend/
    ├── src/
    │   ├── App.tsx (main app with routing)
    │   ├── components/
    │   │   ├── Dashboard/
    │   │   ├── Devices/
    │   │   ├── Campaigns/
    │   │   ├── Analytics/
    │   │   └── UI/
    │   ├── styles/
    │   ├── utils/
    │   └── services/
    
    Work together to build a complete, production-ready dashboard interface.
    """
)

def build_dashboard():
    """Deploy dashboard builder agency to create complete web interface."""
    
    print("DEPLOYING DASHBOARD BUILDER AGENCY SWARM")
    print("Building complete SMS Campaign Platform web dashboard...")
    print("=" * 70)
    
    try:
        dashboard_command = """
        DASHBOARD BUILD DIRECTIVE: CREATE COMPLETE WEB INTERFACE
        
        DashboardArchitect: Coordinate the complete dashboard build and create main App.tsx structure.
        
        IMMEDIATE BUILD TASKS:
        
        1. DashboardArchitect: 
           - Create updated App.tsx with full navigation and routing
           - Set up component architecture and main layout
           - Create shared utilities and API services
           - Coordinate all other agents
        
        2. DeviceDashboardAgent:
           - Build Device Management page showing connected phones
           - Create real-time device status displays
           - Build device connection and control interfaces
        
        3. CampaignBuilderAgent:
           - Build campaign creation wizard
           - Create contact upload and message composition
           - Build scheduling and template management
        
        4. LiveMonitorAgent:
           - Build real-time campaign monitoring dashboard
           - Create live progress tracking and device performance
           - Build campaign control interface
        
        5. AnalyticsAgent:
           - Build analytics dashboard with charts and reports
           - Create performance tracking and insights
           - Build export functionality
        
        6. UIDesignerAgent:
           - Create professional CSS styling for all components
           - Build responsive design and consistent UI
           - Create reusable component library
        
        BUILD COMPLETE FUNCTIONAL DASHBOARD:
        - Device management interface
        - Campaign creation wizard  
        - Real-time monitoring dashboard
        - Analytics and reporting
        - Professional business UI
        
        INTEGRATE WITH EXISTING BACKEND:
        - Connect to /api/devices endpoints
        - Connect to /api/campaigns endpoints
        - Use WebSocket for real-time updates
        - Proper error handling and loading states
        
        START BUILDING NOW - CREATE PRODUCTION-READY WEB DASHBOARD.
        """
        
        print("Starting dashboard build...")
        response = dashboard_agency.get_completion(dashboard_command)
        
        print("\n" + "=" * 70)
        print("DASHBOARD BUILD RESPONSE:")
        print("=" * 70)
        print(response)
        
        return dashboard_agency, response
        
    except Exception as e:
        print(f"Dashboard build error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, str(e)

if __name__ == "__main__":
    print("DASHBOARD BUILDER AGENCY SWARM")
    print("Specialized agents: Dashboard Architect, Device Dashboard, Campaign Builder, Live Monitor, Analytics, UI Designer")
    print()
    
    # Build complete dashboard
    dashboard_instance, build_report = build_dashboard()
    
    if dashboard_instance:
        print("\n✅ Dashboard build completed!")
        print("The complete SMS Campaign Platform web interface has been built.")
        
        # Interactive mode for additional dashboard features
        try:
            print("\nDashboard agency ready for additional features...")
            print("Type 'status' to check build status, 'exit' to stop")
            
            while True:
                user_input = input("\nDashboard Command: ").strip()
                
                if user_input.lower() == 'exit':
                    break
                elif user_input.lower() == 'status':
                    status_response = dashboard_instance.get_completion("Report current dashboard build status and what components have been created")
                    print(f"\nBuild Status:\n{status_response}")
                elif user_input:
                    print("\nProcessing...")
                    response = dashboard_instance.get_completion(user_input)
                    print(f"\nResponse:\n{response}")
                    
        except KeyboardInterrupt:
            print("\n\nDashboard agency stopped")
            
    else:
        print(f"\nDashboard build failed: {build_report}")