const express = require('express');
const request = require('supertest');
const apiRoutes = require('../../../routes');

const app = express();
app.use(express.json());
app.use('/', apiRoutes);

describe('testing-addresses-apis', () => {
  it('GET /addresses - success', (done) => {
    request(app)
      .get('/addresses')
      .expect(200)
      .then((response) => {
        expect(response.body.success).toBeTruthy();
        expect(response.body.message).toBe('Addresses successfully found');
        expect(response.body.data).toBeDefined();
        done();
      })
      .catch(done);
  });
});
