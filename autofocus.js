/**
 * Auto-Focus.js
 * A lightweight library that enables an iframe to bring itself into view
 * without requiring parent page cooperation via postMessage.
 */

(function() {
    // Create and insert the focus target element if it doesn't exist
    function ensureFocusTarget() {
      if (!document.getElementById('auto-focus-target')) {
        const focusTarget = document.createElement('div');
        focusTarget.id = 'auto-focus-target';
        focusTarget.className = 'auto-focus-target';
        focusTarget.setAttribute('tabindex', '-1');
        focusTarget.setAttribute('aria-hidden', 'true');
        focusTarget.style.cssText = 'position:absolute;top:0;left:0;height:1px;width:1px;opacity:0;pointer-events:none;';
        
        // Insert at the beginning of the body
        if (document.body.firstChild) {
          document.body.insertBefore(focusTarget, document.body.firstChild);
        } else {
          document.body.appendChild(focusTarget);
        }
        
        return focusTarget;
      }
      
      return document.getElementById('auto-focus-target');
    }
    
    // Create a status indicator for debugging (optional)
    function createStatusIndicator() {
      if (!document.getElementById('auto-focus-status')) {
        const statusElement = document.createElement('div');
        statusElement.id = 'auto-focus-status';
        statusElement.style.cssText = 'position:fixed;bottom:0;right:0;background:rgba(0,0,0,0.7);color:white;font-size:12px;padding:4px 8px;z-index:9999;display:none;';
        document.body.appendChild(statusElement);
        return statusElement;
      }
      
      return document.getElementById('auto-focus-status');
    }
    
    // Update status (for debugging)
    function updateStatus(message, showStatus = false) {
      const statusElement = createStatusIndicator();
      const now = new Date();
      const time = now.toLocaleTimeString();
      statusElement.textContent = `[${time}] ${message}`;
      
      if (showStatus) {
        statusElement.style.display = 'block';
        setTimeout(() => {
          statusElement.style.display = 'none';
        }, 3000);
      }
      
      console.log(`[AutoFocus] ${message}`);
    }
    
    // Main function to bring iframe into view
    function bringIntoView() {
      const focusTarget = ensureFocusTarget();
      
      // Method 1: Use the focus technique
      try {
        focusTarget.focus({preventScroll: false});
        updateStatus('Used focus() to scroll into view', true);
        return true;
      } catch (e) {
        updateStatus('Focus method failed: ' + e.message);
      }
      
      // Method 2: Try hash-based scrolling as fallback
      try {
        const tempId = 'auto-focus-' + Date.now();
        const currentElement = document.activeElement || document.body;
        const originalId = currentElement.id || '';
        
        currentElement.id = tempId;
        window.location.hash = '#' + tempId;
        
        setTimeout(() => {
          if (originalId) {
            currentElement.id = originalId;
          } else {
            currentElement.removeAttribute('id');
          }
          history.replaceState(null, null, ' ');
        }, 100);
        
        updateStatus('Used hash navigation as fallback', true);
        return true;
      } catch (e) {
        updateStatus('All scrolling methods failed: ' + e.message);
        return false;
      }
    }
    
    // Auto-attach to interactive elements
    function attachToInteractiveElements() {
      // Attach to all interactive elements
      const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
      interactiveElements.forEach(function(element) {
        element.addEventListener('focus', function() {
          bringIntoView();
        });
        
        element.addEventListener('click', function() {
          bringIntoView();
        });
      });
      
      updateStatus('Attached to ' + interactiveElements.length + ' interactive elements');
    }
    
    // Detect when form is active
    let isActive = false;
    let activityTimeout;
    
    function markAsActive() {
      isActive = true;
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        isActive = false;
      }, 30000); // Reset after 30 seconds of inactivity
    }
    
    // Set up activity detection
    document.addEventListener('mousedown', markAsActive);
    document.addEventListener('keydown', markAsActive);
    document.addEventListener('touchstart', markAsActive);
    
    // Auto-focus setup
    function initialize(config = {}) {
      const defaults = {
        autoFocusOnLoad: true,        // Focus when loaded
        focusOnInteraction: true,     // Focus when user interacts
        attachToElements: true,       // Auto-attach to interactive elements
        detectForms: true,            // Try to detect and focus forms
        debugMode: false,             // Show visual status updates
        heartbeatInterval: 0          // Periodic focus check (0 to disable)
      };
      
      const options = {...defaults, ...config};
      
      // Ensure we have our focus target
      ensureFocusTarget();
      
      // Auto-focus on load if enabled
      if (options.autoFocusOnLoad) {
        if (document.readyState === 'complete') {
          setTimeout(bringIntoView, 1000);
        } else {
          window.addEventListener('load', function() {
            setTimeout(bringIntoView, 1000);
          });
        }
      }
      
      // Attach to interactive elements if enabled
      if (options.attachToElements) {
        if (document.readyState === 'complete') {
          attachToInteractiveElements();
        } else {
          window.addEventListener('load', attachToInteractiveElements);
        }
        
        // Re-scan for new elements periodically
        const observer = new MutationObserver(function(mutations) {
          for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              attachToInteractiveElements();
              break;
            }
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
      
      // Form detection
      if (options.detectForms) {
        const formCheckInterval = setInterval(function() {
          const forms = document.querySelectorAll('form, [role="form"], .form, #form');
          
          if (forms.length > 0) {
            clearInterval(formCheckInterval);
            
            forms.forEach(function(form) {
              form.addEventListener('focus', bringIntoView, true);
              form.addEventListener('click', bringIntoView);
              
              const formElements = form.querySelectorAll('input, select, textarea, button');
              formElements.forEach(function(element) {
                element.addEventListener('focus', bringIntoView);
                element.addEventListener('click', bringIntoView);
              });
            });
            
            updateStatus('Form detected and handlers attached');
          }
        }, 1000);
        
        // Stop checking after 10 seconds
        setTimeout(function() {
          clearInterval(formCheckInterval);
        }, 10000);
      }
      
      // Heartbeat interval for active forms
      if (options.heartbeatInterval > 0) {
        setInterval(function() {
          if (isActive) {
            bringIntoView();
          }
        }, options.heartbeatInterval);
      }
      
      // Global debugging
      if (options.debugMode) {
        createStatusIndicator().style.display = 'block';
      }
      
      updateStatus('AutoFocus initialized with options: ' + JSON.stringify(options));
      
      // Return public API
      return {
        focus: bringIntoView,
        setActive: markAsActive,
        updateStatus: updateStatus
      };
    }
    
    // Expose the public API
    window.AutoFocus = {
      init: initialize,
      focus: bringIntoView,
      setActive: markAsActive
    };
  })();