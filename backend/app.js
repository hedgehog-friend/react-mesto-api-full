require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const { celebrate, Joi, errors } = require('celebrate');
const routerUser = require('./routes/users');
const routerCard = require('./routes/cards');
const { login, createUser } = require('./controllers/users');
const { auth } = require('./middlewares/auth');
const { requestLogger, errorLogger } = require('./middlewares/logger');
const NotFoundError = require('./errors/NotFoundError');

const { PORT = 3000 } = process.env;

const app = express();

mongoose.connect('mongodb://localhost:27017/mestodb ', {});

const options = {
  origin: [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://tashkent-mond.nomoredomains.rocks',
    'https://tashkent-mond.nomoredomains.rocks',
  ],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: ['Content-Type', 'origin', 'Authorization'],
  credentials: true,
};

app.use('*', cors(options));

app.use(express.json());
app.use(helmet());
app.use(requestLogger);
app.get('/crash-test', (req, res) => {
  setTimeout(() => {
    throw new Error('Сервер сейчас упадёт');
  }, 0);
  res.send({ message: 'Сервер не работает, приходите завтра' });
});
app.post('/signin', celebrate({
  body: Joi.object().options({ abortEarly: false }).keys({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(72).required(),
  }),
}), login);

app.post('/signup', celebrate({
  body: Joi.object().options({ abortEarly: false }).keys({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(32).required(),
    name: Joi.string().min(2).max(32),
    about: Joi.string().min(2).max(32),
    avatar: Joi.string().regex(/^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_+.~#?&/=[\]!$'()*,;]*)$/),
  }),
}), createUser);
app.use(auth);
app.use('/users', routerUser);
app.use('/cards', routerCard);
app.use('*', () => { throw new NotFoundError('Запрашиваемый ресурс не найден'); });
app.use(errorLogger);
app.use(errors());
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.log(err);
  if (err.statusCode) {
    res.status(err.statusCode).send({ message: err.message });
  } else {
    res.status(500).send({ message: 'На сервере произошла ошибка' });
  }
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
