#!/usr/bin/env python3
"""
Agency Swarm Implementation - Following Exact Documentation
=========================================================

Following the exact Agency Swarm documentation syntax with no deviations.
Based on research results: Basic imports and Agent/Agency creation patterns.
"""

import os
from agency_swarm import Agency, Agent
from dotenv import load_dotenv

# Load environment variables exactly as documented
load_dotenv()

# Set OpenAI API key as documented
os.environ["OPENAI_API_KEY"] = os.getenv('OPENAI_API_KEY')

# Create specialized agents following exact documentation syntax
frontend_agent = Agent(
    name="FrontendDeveloper",
    description="Specialized in developing responsive UI components",
    instructions="Create and optimize frontend code for the messaging dashboard"
)

backend_agent = Agent(
    name="BackendDeveloper",
    description="Specialized in API development and database management",
    instructions="Develop secure backend services for the messaging platform"
)

device_agent = Agent(
    name="DeviceConnectionAgent",
    description="Specialized in USB and mobile device connectivity",
    instructions="Implement device detection, connection protocols, and communication for SMS platform"
)

mobile_agent = Agent(
    name="MobileAppAgent",
    description="Specialized in Android/iOS mobile app development",
    instructions="Create mobile bridge applications for SMS functionality and WebSocket connectivity"
)

qa_agent = Agent(
    name="QualityAssuranceAgent",
    description="Specialized in code validation and quality control",
    instructions="Validate all code for production readiness, block placeholder code, ensure functional implementations"
)

testing_agent = Agent(
    name="TestingAgent", 
    description="Specialized in system testing and performance optimization",
    instructions="Develop comprehensive testing suites, load testing, and performance optimization for SMS platform"
)

# Create an agency with these agents following exact documentation
agency = Agency(
    agents=[frontend_agent, backend_agent, device_agent, mobile_agent, qa_agent, testing_agent],
    shared_instructions="""
    🎯 SMS DRIP CAMPAIGN PLATFORM DEVELOPMENT

    Mission: Build production-ready SMS platform supporting multiple devices, 
    advanced campaigns, scaling to 10k+ recipients with 50+ active devices.

    ZERO TOLERANCE: NO placeholder code, demo data, or TODO comments.
    ALL implementations must be functionally complete.

    Task Master Integration: Update progress with task-master commands.
    """,
    max_prompt_tokens=25000,
    max_completion_tokens=8000
)

def deploy_agency():
    """Deploy the agency following exact documentation"""
    
    print("🚀 DEPLOYING SMS PLATFORM AGENCY SWARM")
    print("Following exact Agency Swarm documentation")
    print("=" * 60)
    
    try:
        # Start the agency with a task following documentation
        print("🚀 Starting agency with kickoff message...")
        
        kickoff_message = """
        🎯 SMS PLATFORM DEVELOPMENT KICKOFF

        Specialized agents: Build the SMS Drip Campaign Platform now.

        CURRENT STATUS:
        ✅ Task Master parsed PRD: 15 main tasks, 83 subtasks  
        ✅ Task 1 (Project Architecture) marked IN-PROGRESS
        ✅ All API keys configured correctly
        ✅ Agency Swarm deployed with 6 specialized agents

        IMMEDIATE ACTIONS:

        BackendDeveloper: Start Task 1.1 (Backend Framework Setup with Node.js/Express + TypeScript)
        FrontendDeveloper: Plan dashboard architecture and component design
        DeviceConnectionAgent: Begin Task 3 (USB Connection Implementation)  
        MobileAppAgent: Start Task 4 (WiFi/Mobile App development)
        QualityAssuranceAgent: Set up validation framework
        TestingAgent: Prepare testing infrastructure

        CRITICAL: NO placeholder code, demo data, or TODO comments allowed.
        ALL code must be production-ready from day one.

        Begin implementation now.
        """
        
        # Get agency response using exact documented method
        response = agency.get_completion(kickoff_message)
        
        print("\n" + "=" * 60)
        print("🎯 AGENCY RESPONSE:")
        print("=" * 60)
        print(response)
        print("=" * 60)
        
        return agency, response
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, str(e)

if __name__ == "__main__":
    print("🎯 SMS PLATFORM AGENCY SWARM")
    print("Exact Agency Swarm documentation implementation")
    print()
    
    # Deploy following exact documentation
    agency_instance, response = deploy_agency()
    
    if agency_instance:
        print("\n🎉 Agency deployed successfully!")
        print("Agents are building the SMS platform...")
        
        # Interactive mode following documentation
        try:
            print("\n📞 Agency ready for commands...")
            print("Type 'exit' to stop")
            
            while True:
                user_input = input("\n💬 Command: ").strip()
                
                if user_input.lower() == 'exit':
                    break
                
                if user_input:
                    print("\n🤖 Processing...")
                    response = agency_instance.get_completion(user_input)
                    print(f"\n📋 Response:\n{response}")
                    
        except KeyboardInterrupt:
            print("\n\n👋 Agency stopped")
            
    else:
        print(f"\n❌ Failed: {response}")