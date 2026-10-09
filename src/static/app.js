document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const signupContainer = document.getElementById("signup-container");
  const staffAuthButton = document.getElementById("staff-auth-button");
  const staffAuthLabel = document.getElementById("staff-auth-label");
  const staffLoginDialog = document.getElementById("staff-login-dialog");
  const staffLoginForm = document.getElementById("staff-login-form");
  const staffLoginError = document.getElementById("staff-login-error");
  const staffLoginCancel = document.getElementById("staff-login-cancel");
  let staffCredentials = null;

  function authorizationHeader(username, password) {
    const credentialBytes = new TextEncoder().encode(`${username}:${password}`);
    const encodedCredentials = btoa(
      Array.from(credentialBytes, (byte) => String.fromCharCode(byte)).join("")
    );
    return `Basic ${encodedCredentials}`;
  }

  function updateStaffControls() {
    signupContainer.hidden = !staffCredentials;
    staffAuthLabel.textContent = staffCredentials ? "Log out" : "Teacher login";
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) => `<li><span class="participant-email">${email}</span>${
                      staffCredentials
                        ? `<button type="button" class="delete-btn" aria-label="Unregister ${email} from ${name}" data-activity="${name}" data-email="${email}">×</button>`
                        : ""
                    }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.currentTarget;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: { Authorization: authorizationHeader(staffCredentials.username, staffCredentials.password) },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  staffAuthButton.addEventListener("click", () => {
    if (staffCredentials) {
      staffCredentials = null;
      updateStaffControls();
      fetchActivities();
      return;
    }

    staffLoginError.textContent = "";
    staffLoginDialog.showModal();
  });

  staffLoginCancel.addEventListener("click", () => staffLoginDialog.close());

  staffLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    staffLoginError.textContent = "";

    const username = document.getElementById("staff-username").value;
    const password = document.getElementById("staff-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { Authorization: authorizationHeader(username, password) },
      });

      if (!response.ok) {
        const result = await response.json();
        staffLoginError.textContent = result.detail || "Unable to sign in";
        return;
      }

      staffCredentials = { username, password };
      staffLoginForm.reset();
      staffLoginDialog.close();
      updateStaffControls();
      fetchActivities();
    } catch (error) {
      staffLoginError.textContent = "Unable to reach the server. Please try again.";
      console.error("Error signing in:", error);
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: { Authorization: authorizationHeader(staffCredentials.username, staffCredentials.password) },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
