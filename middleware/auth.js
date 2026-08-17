// Ensures a user is logged in before accessing a route
exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error', 'Please log in to continue.');
  return res.redirect('/login');
};

// Restricts a route to one or more roles, e.g. hasRole('admin', 'receptionist')
exports.hasRole = (...roles) => {
  return (req, res, next) => {
    if (req.session && req.session.user && roles.includes(req.session.user.role)) {
      return next();
    }
    req.flash('error', 'You do not have permission to access that page.');
    return res.redirect('/dashboard');
  };
};

// If already logged in, skip the login page
exports.redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
};
