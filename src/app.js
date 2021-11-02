const express = require('express');
const cors = require('cors');

const config = require('./config');

const errorHandler = require('./middleware/error');

const routes = require('./routes');

const pkg = require('../package.json');
const { createRoles } = require('./libs/initialSetup');

const app = express();
createRoles();
app.set('config', config);
app.set('pkg', pkg);

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(errorHandler);
// Registrar rutas
routes(app, (err) => {
  if (err) {
    throw err;
  }
});

module.exports = app;
