// middleware/admin.js
module.exports = function (req, res, next) {
  if (req.user && req.user.role === "admin") {
    next(); // Continue if user is admin
  } else {
    res.status(403).json({ msg: "Access denied. Admins only." });
  }
};
