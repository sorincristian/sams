export const authRedirect = {
  saveIntendedDestination: (path: string) => {
    // Prevent logging auth routes as redirect destinations
    if (path === '/' || path.startsWith('/auth') || path.startsWith('/login') || path.startsWith('/reset-password')) {
      return;
    }
    sessionStorage.setItem("auth_redirect_to", path);
  },

  getSavedDestination: (): string | null => {
    return sessionStorage.getItem("auth_redirect_to");
  },

  clearSavedDestination: () => {
    sessionStorage.removeItem("auth_redirect_to");
  }
};
