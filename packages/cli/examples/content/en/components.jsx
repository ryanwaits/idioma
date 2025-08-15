import React from 'react';

// Translation object pattern
export const translations = {
  welcome: "Welcome to our React app",
  navigation: {
    home: "Home",
    about: "About Us",
    contact: "Contact"
  },
  form: {
    labels: {
      name: "Full Name",
      email: "Email Address",
      message: "Your Message"
    },
    placeholders: {
      enterName: "Enter your full name",
      enterEmail: "Enter your email address",
      enterMessage: "Type your message here"
    },
    buttons: {
      submit: "Send Message",
      reset: "Clear Form"
    }
  },
  messages: {
    success: "Thank you! Your message has been sent.",
    error: "Oops! Something went wrong. Please try again."
  }
};

// React component with translatable JSX
function ContactForm() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Form submission logic
  };

  return (
    <div className="contact-form">
      <h1 title="Contact page header">Get in Touch</h1>
      <p>We'd love to hear from you!</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Your Name</label>
          <input 
            id="name"
            type="text"
            placeholder="Enter your full name"
            aria-label="Name input field"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input 
            id="email"
            type="email"
            placeholder="Enter your email"
            aria-label="Email input field"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="message">Message</label>
          <textarea 
            id="message"
            placeholder="Type your message here"
            aria-label="Message text area"
            rows="5"
            required
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" title="Submit the contact form">
            Send Message
          </button>
          <button type="reset" title="Clear all form fields">
            Reset Form
          </button>
        </div>
      </form>
      
      <div className="help-text">
        Need immediate assistance? Call us at (555) 123-4567
      </div>
    </div>
  );
}

// Function call patterns for i18n libraries
const welcomeMsg = t('Welcome back, user!');
const errorMsg = i18n.t('An unexpected error occurred');
const successMsg = translate('Operation completed successfully');

// Component with conditional rendering
function StatusMessage({ type, children }) {
  return (
    <div className={`status-${type}`}>
      <span role="alert">Important notification</span>
      {children}
    </div>
  );
}

export { ContactForm, StatusMessage };