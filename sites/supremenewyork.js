const useProxy = require('puppeteer-page-proxy');
const { solveCaptcha } = require('../helpers/captcha');
const { sendEmail } = require('../helpers/email');
const { getCardDetailsByFriendlyName } = require('../helpers/credit-cards');

async function enterAddressDetails({ page, address }) {
  try {
    const nameSelector = 'input#order_billing_name';
    const emailSelector = 'input#order_email';
    const phoneNumberSelector = 'input#order_tel';
    const address1Selector = 'input#bo';
    const address2Selector = 'input#oba3';
    const postalCodeSelector = 'input#order_billing_zip';
    // const citySelector = 'input#order_billing_city';
    // const stateSelector = 'select#order_billing_state';

    await page.waitForSelector(nameSelector);
    await page.type(nameSelector, `${address.first_name} ${address.last_name}`, {
      delay: 10
    });
    await page.waitForTimeout(2000);

    await page.waitForSelector(emailSelector);
    await page.type(emailSelector, address.email_address, {
      delay: 10
    });
    await page.waitForTimeout(2000);

    await page.waitForSelector(phoneNumberSelector);
    await page.type(phoneNumberSelector, address.phone_number, {
      delay: 10
    });
    await page.waitForTimeout(2000);

    await page.waitForSelector(address1Selector);
    await page.type(address1Selector, address.address_line_1, {
      delay: 10
    });
    await page.waitForTimeout(2000);

    await page.waitForSelector(address2Selector);
    await page.type(address2Selector, address.address_line_2, {
      delay: 10
    });
    await page.waitForTimeout(2000);

    await page.waitForSelector(postalCodeSelector);
    await page.type(postalCodeSelector, address.postal_code, {
      delay: 10
    });
    await page.waitForTimeout(2000);

    // Prefilled by supremenewyork

    // await page.waitForSelector(citySelector);
    // await page.type(citySelector, address.city, {
    //     delay: 10
    // });
    // await page.waitForTimeout(2000);

    // await page.waitForSelector(stateSelector);
    // await page.select(stateSelector, address.state);
    // await page.waitForTimeout(2000);
  } catch (err) {
    throw err;
  }
}

async function checkout({
  taskLogger,
  page,
  billingAddress,
  autoSolveCaptchas,
  notificationEmailAddress,
  url,
  size,
  cardFriendlyName
}) {
  try {
    taskLogger.info('Navigating to checkout page');
    const checkoutButtonSelector = 'a.button.checkout';
    await page.waitForSelector(checkoutButtonSelector);
    await page.click(checkoutButtonSelector);

    let hasCaptcha = false;
    let checkoutComplete = false;

    let cardDetails = {
      cardNumber: process.env.CARD_NUMBER,
      nameOnCard: process.env.NAME_ON_CARD,
      expirationMonth: process.env.EXPIRATION_MONTH,
      expirationYear: process.env.EXPIRATION_YEAR,
      securityCode: process.env.SECURITY_CODE
    };
    if (cardFriendlyName) {
      cardDetails = getCardDetailsByFriendlyName(cardFriendlyName);
    }

    const creditCardNumberSelector = 'div#card_details input[placeholder="number"]';
    const creditCardExpirationMonthSelector = 'select#credit_card_month';
    const creditCardExpirationYearSelector = 'select#credit_card_year';
    const creditCardCVVSelector = 'div#card_details input[placeholder="CVV"]';

    const orderTermsCheckboxSelector = 'input#order_terms';
    const submitButtonsSelector = 'div#pay input[type="submit"]';

    taskLogger.info('Entering billing details (must be same as shipping details)');
    await enterAddressDetails({ page, address: billingAddress });

    taskLogger.info('Entering card details');
    await page.waitForSelector(creditCardNumberSelector);
    await page.type(
      creditCardNumberSelector,
      cardDetails.cardNumber,
      {
        delay: 10
      }
    );

    await page.waitForSelector(
      creditCardExpirationMonthSelector
    );
    await page.select(
      creditCardExpirationMonthSelector,
      cardDetails.expirationMonth
    );
    await page.waitForTimeout(2000);

    await page.waitForSelector(
      creditCardExpirationYearSelector
    );
    await page.select(
      creditCardExpirationYearSelector,
      `20${cardDetails.expirationYear}`
    );
    await page.waitForTimeout(2000);

    await page.type(creditCardCVVSelector, cardDetails.securityCode, {
      delay: 10
    });
    await page.waitForTimeout(2000);

    await page.waitForSelector(orderTermsCheckboxSelector);
    await page.click(orderTermsCheckboxSelector);
    await page.waitForTimeout(5000);

    await page.waitForSelector(submitButtonsSelector);
    await page.click(submitButtonsSelector);
    await page.waitForTimeout(5000);

    const captchaSelector = 'div.g-recaptcha';
    try {
      hasCaptcha = await page.waitForSelector(captchaSelector);
    } catch (err) {
      // no-op if timeout occurs
    }

    if (hasCaptcha) {
      if (autoSolveCaptchas) {
        const solved = await solveCaptcha({
          taskLogger, page, captchaSelector
        });
        if (solved) hasCaptcha = false;
        await page.evaluate(() => {
          document.querySelector('iframe[title="recaptcha challenge"]').parentNode.style = 'display:none';
        });
      } else {
        const recipient = notificationEmailAddress;
        const subject = 'Checkout task unsuccessful';
        const text = `The checkout task for ${url} size ${size} has a captcha. Please open the browser and complete it within 5 minutes.`;
        await sendEmail({ recipient, subject, text });
        taskLogger.info(text);

        await Promise.race([
          new Promise(() => {
            setTimeout(() => {
              throw new Error('The captcha was not solved in time.');
            }, 5 * 60 * 1000);
          }),
          new Promise((resolve) => {
            const interval = setInterval(async () => {
              const solved = await page.evaluate(() => {
                return document.querySelector('#g-recaptcha-response').value.length > 0;
              });
              if (solved) {
                hasCaptcha = false;
                resolve();
                clearInterval(interval);
              }
            }, 1000);
          })
        ]);
      }
    }

    const confirmationTabSelected = 'div#cart-header div#tabs div.tab.tab-confirmation.selected';
    await page.waitForSelector(confirmationTabSelected);

    checkoutComplete = await page.evaluate(() => {
      const confirmationFailed = document.querySelector('div#confirmation.failed');
      return Boolean(!confirmationFailed);
    });

    return checkoutComplete;
  } catch (err) {
    throw err;
  }
}

exports.guestCheckout = async ({
  taskLogger,
  page,
  url,
  proxyString,
  size,
  billingAddress,
  autoSolveCaptchas,
  notificationEmailAddress,
  cardFriendlyName
}) => {
  try {
    await useProxy(page, proxyString);
    taskLogger.info('Navigating to URL');
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    let isInCart = false;
    while (!isInCart) {
      await page.evaluate((sizeStr) => {
        const form = document.querySelector('div#cctrl form#cart-addf');

        if (sizeStr) {
          const sElem = form.querySelectorAll('fieldset select#s');
          sElem.selected = true;
        }

        const atcButtonElem = form.querySelector('fieldset#add-remove-buttons input[type="submit"]');
        atcButtonElem.click();
      }, size);

      await page.waitForTimeout(1 * 1000);

      isInCart = await page.evaluate(() => {
        const atcButtonElem = document.querySelector('fieldset#add-remove-buttons input[type="submit"]');
        return atcButtonElem.getAttribute('value') === 'remove';
      });
    }

    let checkoutComplete = false;
    if (isInCart) {
      await page.waitForTimeout(2 * 1000);

      checkoutComplete = await checkout({
        taskLogger,
        page,
        billingAddress,
        autoSolveCaptchas,
        notificationEmailAddress,
        url,
        size,
        cardFriendlyName
      });
    }

    return checkoutComplete;
  } catch (err) {
    throw err;
  }
};
