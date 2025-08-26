import React, { useState, useRef } from 'react';
import './CampaignBuilder.css';

interface Contact {
  phone: string;
  name?: string;
  [key: string]: any;
}

interface Campaign {
  name: string;
  message: string;
  contacts: Contact[];
  schedule: {
    startTime: string;
    messagesPerMinute: number;
    distribution: 'round-robin' | 'weighted' | 'single-device';
  };
}

const CampaignBuilder: React.FC = () => {
  const [campaign, setCampaign] = useState<Campaign>({
    name: '',
    message: '',
    contacts: [],
    schedule: {
      startTime: '',
      messagesPerMinute: 10,
      distribution: 'round-robin'
    }
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [contactsFile, setContactsFile] = useState<File | null>(null);
  const [previewMessage, setPreviewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setContactsFile(file);
      parseCSVFile(file);
    }
  };

  const parseCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const contacts: Contact[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length >= headers.length && values[0].trim()) {
          const contact: Contact = { phone: '' };
          
          headers.forEach((header, index) => {
            const value = values[index]?.trim() || '';
            if (header.toLowerCase().includes('phone') || header.toLowerCase().includes('number')) {
              contact.phone = value;
            } else if (header.toLowerCase().includes('name')) {
              contact.name = value;
            } else {
              contact[header] = value;
            }
          });
          
          // Validate phone number
          if (contact.phone && /^\+?[\d\s\-\(\)]+$/.test(contact.phone)) {
            contacts.push(contact);
          }
        }
      }
      
      setCampaign(prev => ({ ...prev, contacts }));
      setCurrentStep(2);
    };
    
    reader.readAsText(file);
  };

  const generatePreview = (message: string, contact: Contact) => {
    let preview = message;
    
    // Replace variables with contact data
    Object.keys(contact).forEach(key => {
      const placeholder = `{${key.toUpperCase()}}`;
      if (preview.includes(placeholder)) {
        preview = preview.replace(new RegExp(placeholder, 'g'), contact[key] || '');
      }
    });
    
    return preview;
  };

  const updatePreview = () => {
    if (campaign.contacts.length > 0 && campaign.message) {
      const preview = generatePreview(campaign.message, campaign.contacts[0]);
      setPreviewMessage(preview);
    }
  };

  React.useEffect(() => {
    updatePreview();
  }, [campaign.message, campaign.contacts]);

  const validateCampaign = (): string | null => {
    if (!campaign.name.trim()) return 'Campaign name is required';
    if (!campaign.message.trim()) return 'Message is required';
    if (campaign.contacts.length === 0) return 'At least one contact is required';
    if (!campaign.schedule.startTime) return 'Start time is required';
    
    return null;
  };

  const createCampaign = async () => {
    const validationError = validateCampaign();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaign.name,
          message: campaign.message,
          recipients: campaign.contacts.map(c => ({
            phone: c.phone,
            name: c.name,
            variables: c
          })),
          schedule: campaign.schedule,
          status: 'scheduled'
        })
      });

      if (response.ok) {
        alert('Campaign created successfully!');
        // Reset form
        setCampaign({
          name: '',
          message: '',
          contacts: [],
          schedule: {
            startTime: '',
            messagesPerMinute: 10,
            distribution: 'round-robin'
          }
        });
        setCurrentStep(1);
        setContactsFile(null);
        setPreviewMessage('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="step-content">
      <div className="step-header">
        <h3>Step 1: Campaign Details & Contacts</h3>
        <p>Set up your campaign name and upload your contact list</p>
      </div>

      <div className="form-group">
        <label>Campaign Name</label>
        <input
          type="text"
          value={campaign.name}
          onChange={(e) => setCampaign(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter campaign name (e.g., Black Friday Promotion)"
          maxLength={100}
        />
      </div>

      <div className="file-upload-section">
        <label>Upload Contact List</label>
        <div className="file-upload-area">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          
          {contactsFile ? (
            <div className="file-selected">
              <div className="file-info">
                <span className="file-name">📄 {contactsFile.name}</span>
                <span className="file-size">{(contactsFile.size / 1024).toFixed(1)} KB</span>
              </div>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
              >
                Change File
              </button>
            </div>
          ) : (
            <div className="file-drop-zone" onClick={() => fileInputRef.current?.click()}>
              <div className="upload-icon">📁</div>
              <p><strong>Click to upload</strong> or drag and drop</p>
              <p className="file-requirements">CSV files only • Max 10MB</p>
            </div>
          )}
        </div>

        <div className="csv-format-help">
          <h4>CSV Format Requirements:</h4>
          <ul>
            <li>First row should contain column headers</li>
            <li>Include a column with "phone" or "number" in the header</li>
            <li>Optional: Include "name" column for personalization</li>
            <li>Example: phone,name,company</li>
          </ul>
        </div>
      </div>

      {campaign.contacts.length > 0 && (
        <div className="contacts-summary">
          <h4>✅ {campaign.contacts.length} contacts loaded</h4>
          <div className="contact-preview">
            <strong>Sample contacts:</strong>
            {campaign.contacts.slice(0, 3).map((contact, index) => (
              <div key={index} className="contact-item">
                {contact.phone} {contact.name && `(${contact.name})`}
              </div>
            ))}
            {campaign.contacts.length > 3 && <div>... and {campaign.contacts.length - 3} more</div>}
          </div>
          
          <button 
            className="btn-primary"
            onClick={() => setCurrentStep(2)}
          >
            Continue to Message →
          </button>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="step-content">
      <div className="step-header">
        <h3>Step 2: Compose Message</h3>
        <p>Write your SMS message with personalization variables</p>
      </div>

      <div className="message-editor">
        <div className="message-input">
          <label>Message Content</label>
          <textarea
            value={campaign.message}
            onChange={(e) => setCampaign(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Hi {NAME}, check out our amazing offer..."
            rows={4}
            maxLength={160}
          />
          <div className="character-count">
            {campaign.message.length}/160 characters
          </div>
        </div>

        <div className="variables-panel">
          <h4>Available Variables</h4>
          <p>Click to insert into your message:</p>
          <div className="variables-list">
            {campaign.contacts.length > 0 && Object.keys(campaign.contacts[0]).map(key => (
              <button
                key={key}
                type="button"
                className="variable-tag"
                onClick={() => {
                  const placeholder = `{${key.toUpperCase()}}`;
                  setCampaign(prev => ({ 
                    ...prev, 
                    message: prev.message + placeholder 
                  }));
                }}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {previewMessage && (
        <div className="message-preview">
          <h4>Message Preview</h4>
          <div className="preview-content">
            <div className="phone-mockup">
              <div className="message-bubble">
                {previewMessage}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="step-navigation">
        <button 
          className="btn-secondary"
          onClick={() => setCurrentStep(1)}
        >
          ← Back to Contacts
        </button>
        
        <button 
          className="btn-primary"
          onClick={() => setCurrentStep(3)}
          disabled={!campaign.message.trim()}
        >
          Continue to Schedule →
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="step-content">
      <div className="step-header">
        <h3>Step 3: Schedule & Settings</h3>
        <p>Configure when and how your messages will be sent</p>
      </div>

      <div className="schedule-settings">
        <div className="form-group">
          <label>Start Time</label>
          <input
            type="datetime-local"
            value={campaign.schedule.startTime}
            onChange={(e) => setCampaign(prev => ({
              ...prev,
              schedule: { ...prev.schedule, startTime: e.target.value }
            }))}
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>

        <div className="form-group">
          <label>Sending Rate</label>
          <select
            value={campaign.schedule.messagesPerMinute}
            onChange={(e) => setCampaign(prev => ({
              ...prev,
              schedule: { ...prev.schedule, messagesPerMinute: parseInt(e.target.value) }
            }))}
          >
            <option value={5}>5 messages per minute (Slow)</option>
            <option value={10}>10 messages per minute (Normal)</option>
            <option value={20}>20 messages per minute (Fast)</option>
            <option value={30}>30 messages per minute (Very Fast)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Device Distribution</label>
          <select
            value={campaign.schedule.distribution}
            onChange={(e) => setCampaign(prev => ({
              ...prev,
              schedule: { ...prev.schedule, distribution: e.target.value as any }
            }))}
          >
            <option value="round-robin">Round Robin (Equal distribution)</option>
            <option value="weighted">Weighted (Based on device performance)</option>
            <option value="single-device">Single Device (Use fastest device)</option>
          </select>
        </div>
      </div>

      <div className="campaign-summary">
        <h4>Campaign Summary</h4>
        <div className="summary-details">
          <div className="summary-item">
            <strong>Campaign:</strong> {campaign.name}
          </div>
          <div className="summary-item">
            <strong>Recipients:</strong> {campaign.contacts.length} contacts
          </div>
          <div className="summary-item">
            <strong>Start Time:</strong> {new Date(campaign.schedule.startTime).toLocaleString()}
          </div>
          <div className="summary-item">
            <strong>Est. Duration:</strong> {Math.ceil(campaign.contacts.length / campaign.schedule.messagesPerMinute)} minutes
          </div>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <div className="step-navigation">
        <button 
          className="btn-secondary"
          onClick={() => setCurrentStep(2)}
        >
          ← Back to Message
        </button>
        
        <button 
          className="btn-primary create-campaign"
          onClick={createCampaign}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Campaign...' : '🚀 Create Campaign'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="campaign-builder">
      <div className="builder-header">
        <h2>Create SMS Campaign</h2>
        <div className="progress-indicator">
          <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
        </div>
      </div>

      <div className="builder-content">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default CampaignBuilder;