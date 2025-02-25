const User = require('../models/Users');
const Role = require('../models/Roles');
const { checkAdmin } = require('../middleware/auth');
const { verifyEmailAndId, verifyEmail, verifyPassword } = require('../utils/utils');

const singUp = async (req, resp) => {
  const {
    email,
    password,
    roles,
  } = req.body;
  if (!email || !password) {
    return resp.status(400).json({ message: 'You didn´t enter email or password' });
  }
  if (verifyEmail(email) === false) {
    return resp.status(403).json({ message: 'Email format is invalid' });
  } if (verifyPassword(password) === false) {
    return resp.status(403).json({ message: 'Password format is invalid' });
  }
  const userExists = await User.findOne({ email: req.body.email });
  if (userExists) {
    return resp.status(403).json({ message: 'user already exists' });
  }
  const newUser = new User({
    email,
    password: await User.encryptPassword(password),
  });
  if (roles) {
    const foundRoles = await Role.find({ name: { $in: roles } });
    newUser.roles = foundRoles.map((role) => role._id);
  } else {
    const role = await Role.findOne({ name: 'user' });
    newUser.roles = [role._id];
  }
  const savedUser = await newUser.save();
  return resp.status(200).json(savedUser);
};

const getUsers = async (req, resp) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const page = parseInt(req.query.page, 10) || 1;
  const allUsers = await User.paginate({}, { limit, page });
  const linkHeader = {
    first: `http://localhost:8080/products?limit=${limit}&page=1`,
    prev: allUsers.hasPrevPage ? `http://localhost:8080/products?limit=${limit}&page=${page - 1}` : false,
    next: allUsers.hasNextPage ? `http://localhost:8080/products?limit=${limit}&page=${page + 1}` : false,
    last: allUsers.totalPages ? `http://localhost:8080/products?limit=${limit}&page=${allUsers.totalPages}` : false,
  };
  resp.links(linkHeader);
  resp.status(200).json(allUsers.docs);
};

const getUserById = async (req, resp) => {
  const validation = verifyEmailAndId(req.params.uid);
  if (validation !== false) {
    const user = await User.findOne(validation);
    if (user === null) {
      return resp.status(404).json({ message: 'The user doesn´t exist' });
    }
    checkAdmin(req).then(async (admin) => {
      if ((admin === true) || (req.userId === user.id)) {
        return resp.status(200).json(user);
      }
      return resp.status(403).json({ message: 'you need the admin role' });
    });
  } else {
    return resp.status(404).json({ message: 'Email o id format is invalid' });
  }
};

const updateUserById = async (req, resp) => {
  const validation = verifyEmailAndId(req.params.uid);
  if (validation !== false) {
    if ((Object.keys(req.body).length === 0) || req.body.email === '' || req.body.password === '') {
      return resp.status(400).json({ message: 'You didn´t enter email or password' });
    }
    const user = await User.findOne(validation);
    if (user === null) {
      return resp.status(404).json({ message: 'The user doesn´t exist' });
    }
    checkAdmin(req).then(async (admin) => {
      if ((admin === true) || (req.userId === user.id)) {
        if (req.body.password) {
          const encryptPassword = await User.encryptPassword(req.body.password);
          req.body.password = encryptPassword;
        }
        if (admin === false && req.body.roles) {
          return resp.status(403).json({ message: 'you need the admin role' });
        }
        const updatedUser = await User.findByIdAndUpdate(user.id, req.body, {
          new: true,
        });
        return resp.status(200).json(updatedUser);
      }
      return resp.status(403).json({ mesagge: 'you need the admin role' });
    });
  } else {
    resp.status(404).json({ message: 'Email o id format is invalid' });
  }
};

const deleteUserById = async (req, resp) => {
  const validation = verifyEmailAndId(req.params.uid);
  if (validation !== false) {
    const user = await User.findOne(validation);
    if (user === null) {
      return resp.status(404).json({ message: 'The user doesn´t exist' });
    }
    checkAdmin(req).then(async (admin) => {
      if ((admin === true) || (req.userId === user.id)) {
        await User.findByIdAndDelete(user.id);
        return resp.status(200).json(user);
      }
      return resp.status(403).json({ message: 'you need the admin role' });
    });
  } else {
    return resp.status(404).json({ message: 'Email o id format is invalid' });
  }
};

module.exports = {
  getUsers,
  singUp,
  getUserById,
  updateUserById,
  deleteUserById,
};
