# SneakerBot

This bot uses Node.js and Puppeteer to automate the checkout on various sneaker websites. It currently works on the Footsites (footlocker.com, footaction.com, eastbay.com, champssports.com) and Nike.com.

## Configure environment variables

Make a copy of the `.env.example` file, replacing `example` with the name of your `NODE_ENV` e.g. `local` or `development`.

Declare the environment name with:

`$ export NODE_ENV=local`

## Run the DB migrations

`$ knex migrate:latest`

## Run the DB seeders

`$knex seed:run`

## Start the server

`$ npm start`

## API

For each API, view the docs and try the requests in Postman.

- [Addresses](https://documenter.getpostman.com/view/5027621/TVt2c3ef)
- [Proxies](https://documenter.getpostman.com/view/5027621/TVt2c3ee)
- [Tasks](https://documenter.getpostman.com/view/5027621/TVt2c3ed)
