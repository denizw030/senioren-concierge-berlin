
      const eye =
        '<svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.7"></circle></svg>';
      const eyeOff =
        '<svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18"></path><path d="M10.7 6.1A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16.3 16.3 0 0 1-2.2 2.8"></path><path d="M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a10 10 0 0 0 4.1-.9"></path><path d="M9.8 9.8A3.1 3.1 0 0 0 14.2 14.2"></path></svg>';
      document.querySelectorAll("[data-password-toggle]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const input = document.getElementById(btn.dataset.passwordToggle);
          const show = input.type === "password";
          input.type = show ? "text" : "password";
          btn.setAttribute(
            "aria-label",
            show ? "Passwort ausblenden" : "Passwort anzeigen",
          );
          btn.title = show ? "Passwort ausblenden" : "Passwort anzeigen";
          btn.innerHTML = show ? eyeOff : eye;
        });
      });
    