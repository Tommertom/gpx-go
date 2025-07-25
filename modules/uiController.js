export class UIController {
  constructor() {
    this.initEventListeners();
  }

  updateGpxButtonStates(gpxLoaded) {
    const desktopButton = document.getElementById("gpxButton");
    const mobileButton = document.getElementById("gpxButtonMobile");

    if (gpxLoaded) {
      if (desktopButton) desktopButton.textContent = "Clear GPX";
      if (mobileButton) mobileButton.textContent = "Clear GPX";
    } else {
      if (desktopButton) desktopButton.textContent = "Load GPX";
      if (mobileButton) mobileButton.textContent = "Load GPX";
    }
  }

  showStatus(message, duration = 2000) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.style.display = "block";
    setTimeout(() => {
      status.style.display = "none";
    }, duration);
  }

  handleGpxButtonClick(clearCallback, loadCallback) {
    const desktopButton = document.getElementById("gpxButton");

    if (desktopButton && desktopButton.textContent === "Load GPX") {
      loadCallback();
    } else if (desktopButton) {
      clearCallback();
    }
  }

  showGpxSelectionDialog(
    gpxFiles,
    onSelectCallback,
    onFileUploadCallback,
    onDeleteCallback
  ) {
    const dialog = document.getElementById("gpxSelectionDialog");
    const fileList = document.getElementById("gpxFileList");

    if (!dialog || !fileList) {
      console.error("GPX selection dialog elements not found");
      // Fallback to direct file upload
      onFileUploadCallback();
      return;
    }

    // Clear existing content
    fileList.innerHTML = "";

    // Add stored GPX files
    gpxFiles.forEach((gpxFile, index) => {
      const fileItem = document.createElement("div");
      fileItem.style.cssText = `
        padding: 12px;
        margin-bottom: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: #f8f9fa;
        transition: background-color 0.2s;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      const fileInfo = document.createElement("div");
      fileInfo.className = "gpx-file-info";
      fileInfo.style.cssText = `
        flex: 1;
        cursor: pointer;
      `;

      fileInfo.innerHTML = `
        <div class="gpx-file-name" style="font-weight: bold; margin-bottom: 4px;">${
          gpxFile.displayName
        }</div>
        <div style="font-size: 0.9em; color: #666;">
          ${new Date(gpxFile.timestamp).toLocaleDateString()} ${new Date(
        gpxFile.timestamp
      ).toLocaleTimeString()}
        </div>
      `;

      const deleteButton = document.createElement("button");
      deleteButton.className = "gpx-delete-btn";
      deleteButton.innerHTML = "🗑️";
      deleteButton.title = `Delete ${gpxFile.displayName}`;

      fileItem.addEventListener("mouseenter", () => {
        fileItem.style.backgroundColor = "#e9ecef";
      });

      fileItem.addEventListener("mouseleave", () => {
        fileItem.style.backgroundColor = "#f8f9fa";
      });

      fileInfo.addEventListener("click", () => {
        this.hideGpxSelectionDialog();
        onSelectCallback(gpxFile.filename);
      });

      deleteButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if (
          confirm(`Are you sure you want to delete "${gpxFile.displayName}"?`)
        ) {
          if (onDeleteCallback && onDeleteCallback(gpxFile.filename)) {
            // Remove the item from the dialog
            fileItem.remove();

            // If no more GPX files, close dialog and show file upload
            const remainingItems = fileList.querySelectorAll("[data-gpx-file]");
            if (remainingItems.length === 0) {
              this.hideGpxSelectionDialog();
              onFileUploadCallback();
            }
          }
        }
      });

      fileItem.setAttribute("data-gpx-file", "true");
      fileItem.appendChild(fileInfo);
      fileItem.appendChild(deleteButton);
      fileList.appendChild(fileItem);
    });

    // Add "Select File" option at the end
    const selectFileItem = document.createElement("div");
    selectFileItem.style.cssText = `
      padding: 12px;
      margin-bottom: 0;
      border: 2px dashed #28a745;
      border-radius: 4px;
      cursor: pointer;
      background-color: #f8fff8;
      text-align: center;
      font-weight: bold;
      color: #28a745;
      transition: background-color 0.2s;
    `;

    selectFileItem.innerHTML = `
      <div>📁 Select New File</div>
      <div style="font-size: 0.9em; font-weight: normal; margin-top: 4px;">
        Browse for a GPX file on your device
      </div>
    `;

    selectFileItem.addEventListener("mouseenter", () => {
      selectFileItem.style.backgroundColor = "#e6ffe6";
    });

    selectFileItem.addEventListener("mouseleave", () => {
      selectFileItem.style.backgroundColor = "#f8fff8";
    });

    selectFileItem.addEventListener("click", () => {
      this.hideGpxSelectionDialog();
      onFileUploadCallback();
    });

    fileList.appendChild(selectFileItem);

    // Show dialog
    dialog.style.display = "flex";
  }

  hideGpxSelectionDialog() {
    const dialog = document.getElementById("gpxSelectionDialog");
    if (dialog) {
      dialog.style.display = "none";
    }
  }

  clearFileInput() {
    const fileInput = document.getElementById("gpxFile");
    if (fileInput) {
      fileInput.value = "";
    }
  }

  initEventListeners() {
    // Set up cancel button for GPX selection dialog
    const cancelButton = document.getElementById("cancelGpxSelection");
    if (cancelButton) {
      cancelButton.addEventListener("click", () => {
        this.hideGpxSelectionDialog();
      });
    }

    // Close dialog when clicking outside of it
    const dialog = document.getElementById("gpxSelectionDialog");
    if (dialog) {
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) {
          this.hideGpxSelectionDialog();
        }
      });
    }
  }

  initCompassDisplay() {
    const compassDisplay = document.getElementById("compass-direction");
    if (compassDisplay) {
      compassDisplay.textContent = "Nothing";
      compassDisplay.style.display = "block";
    }
  }

  updateCompassDisplay(heading) {
    const compassDisplay = document.getElementById("compass-direction");

    if (heading !== null) {
      // Update the arrow rotation
      const svg = document.querySelector(".arrow");
      if (svg) {
        svg.style.transform = `rotate(${heading}deg)`;
      }

      // Update the compass direction display
      if (compassDisplay) {
        compassDisplay.textContent = `${Math.round(heading)}°`;
        compassDisplay.style.display = "block";
      }
    } else {
      // No compass heading available
      if (compassDisplay) {
        compassDisplay.textContent = "Nothing";
        compassDisplay.style.display = "block";
      }
    }
  }

  updateFollowButtons(followMode) {
    const followText = followMode ? "Unfollow" : "Follow";
    document.getElementById("toggleFollow").textContent = followText;
    document.getElementById("toggleFollowMobile").textContent = followText;
  }

  showDebugInfo(message) {
    const debugDiv = document.getElementById("debug-info");
    const debugContent = document.getElementById("debug-content");

    if (debugDiv && debugContent) {
      // Show the debug area
      debugDiv.style.display = "block";

      // Add timestamp to message
      const timestamp = new Date().toLocaleTimeString();
      const formattedMessage = `[${timestamp}] ${message}`;

      // Add new message to the top
      const messageDiv = document.createElement("div");
      messageDiv.textContent = formattedMessage;
      messageDiv.style.marginBottom = "2px";

      debugContent.insertBefore(messageDiv, debugContent.firstChild);

      // Keep only last 10 messages
      while (debugContent.children.length > 10) {
        debugContent.removeChild(debugContent.lastChild);
      }

      // Auto-scroll to top
      debugDiv.scrollTop = 0;
    }
  }

  toggleDebugDisplay() {
    const debugDiv = document.getElementById("debug-info");
    if (debugDiv) {
      debugDiv.style.display =
        debugDiv.style.display === "none" ? "block" : "none";
    }
  }

  clearDebugInfo() {
    const debugContent = document.getElementById("debug-content");
    if (debugContent) {
      debugContent.innerHTML = "";
    }
  }
}
