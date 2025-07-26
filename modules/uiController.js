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

  clearFileInput() {
    const fileInput = document.getElementById("gpxFile");
    if (fileInput) {
      fileInput.value = "";
    }
  }

  initEventListeners() {
    // Event listeners will be set up in the main app
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
}
