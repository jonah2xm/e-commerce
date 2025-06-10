
const jwt=require('jsonwebtoken')
exports.authenticateUser = (req, res, next) => {
  const token = req.cookies.token;

  if (!token)
    return res.status(401).json({ message: "Unauthorized: No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

exports.authorizeRoles = (...allowedRoles) => {
  console.log('yes its working im in authmiddleware')
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Access denied" });
    }
    next();
  };
};
