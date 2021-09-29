/* jshint esversion: 8 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const adminPartner = require("firebase-admin");
const Amadeus = require("amadeus");
const stripe = require(
    "stripe"
)(
    "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"
);
const serviceAccount = require("./serviceAccountKey.json");
const partnerServiceAccount = require("./serviceAccountKeyPartner.json");

const amadeus = new Amadeus({
  clientId: "RW15h3taBD1wsiCdE1HVtuYV9jNGuVG4",
  clientSecret: "aflvAapo4p4ygdLA",
  hostname: "production",
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://zerojet-85661.firebaseio.com",
});

adminPartner.initializeApp({
  credential: admin.credential.cert(partnerServiceAccount),
  databaseURL: "https://zerojet-partners-default-rtdb.firebaseio.com",
});


const fs = admin.firestore();


exports.createCustomer = functions.https.onCall((data, context) => {
  const userID = data.userID;
  const userName = data.userName;
  const userEmail = data.userEmail;

  let resultingData;
  let docRef;


  return stripe.customers.create({
    description: userID,
    email: userEmail,
    name: userName,

  }).then((response) => {
    docRef = fs.collection("userData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("Payments");


    resultingData = JSON.parse(JSON.stringify(response));
    console.log("customerCreationSuccess", resultingData);
    docRef.set({
      resultingData,
    });

    return resultingData;
  }).catch((err) => {
    docRef = fs.collection("userData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("Payments")
        .collection("Errors");


    resultingData = JSON.parse(JSON.stringify(err));
    console.log("customerCreationError", resultingData);
    docRef.add({
      "error": resultingData,
    });

    return resultingData;
  });
});


exports.createCustomerCard = functions.https.onCall((data, context) => {
  const PAYMENT_METHOD_ID = data.PaymentMethodID;
  const authcode = data.authCode;
  const res = authcode.split("}{");

  const CUSTOMER_ID = res[0];
  const userID = res[1];


  console.log("ReadTest1", CUSTOMER_ID);
  console.log("ReadTest2", userID);
  console.log("ReadTest3", PAYMENT_METHOD_ID);


  let resultingData;
  let docRef;
  let quickRef;

  return stripe.paymentMethods.attach(
      PAYMENT_METHOD_ID,
      {
        customer: CUSTOMER_ID,
      }).then((response) => {
    docRef = fs.collection("userData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("Payments");


    resultingData = JSON.parse(JSON.stringify(response));
    console.log("customerCreationSuccess", resultingData);


    return docRef.update({
      resultingData,
    }).then((results) => {
      quickRef = fs.collection("userData")
          .doc(userID)
          .collection("allUserDocuments")
          .doc("PaymentsQuickRef");

      quickRef.set({
        "status": "success",
      });

      console.log("Document successfully updated!", results);
      return {text: "success"};
    }).catch((error) => {
      // The document probably doesn't exist.
      console.error("Error updating document: ", error);
      return {text: "Invalid Auth Code 1"};
    });
  }).catch((err) => {
    docRef = fs.collection("userData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("Payments")
        .collection("Errors");


    resultingData = JSON.parse(JSON.stringify(err));
    console.log("customerCreationError", resultingData);
    docRef.add({
      "error": resultingData,
    });

    return {text: "Invalid Auth Code 2"};
  });
});


exports.captureTopUpPayment = functions.https.onCall((data, context) => {
  const PAYMENT_METHOD_ID = data.pm;
  const CUSTOMER_ID = data.cus;
  const userID = data.userID;
  const amount = data.amount;
  const currency = data.currency;

  const today = new Date();
  let dd = today.getDate();
  let mm = today.getMonth() + 1; // January is 0!

  const yyyy = today.getFullYear();
  if (dd < 10) {
    dd = "0" + dd;
  }
  if (mm < 10) {
    mm = "0" + mm;
  }
  const refDate = yyyy + "." + mm + "." + dd;


  let resultingData;
  let resultingBalanceTransactionData;
  let docRef;
  let errorData;
  let topUpPaymentRef;
  let topUpPaymentRecordsRef;
  let balanceTransactionRecordsRef;
  let balanceTransactionRecordRefTwo;
  let lastBalanceTransactionStatusRef;

  return stripe.paymentIntents.create({
    amount: amount, // $1 = 100, $10 = 1000
    currency: currency,
    customer: CUSTOMER_ID,
    payment_method: PAYMENT_METHOD_ID,
    error_on_requires_action: true,
    confirm: true,
  }).then((results) => {
    resultingData = JSON.parse(JSON.stringify(results));

    topUpPaymentRef = fs.collection("userData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("topUpPaymentRef");

    topUpPaymentRef.set({
      "status": "success",
      "refDate": refDate,
    });

    topUpPaymentRecordsRef = fs.collection("userData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("successfulTopUpPayments")
        .collection(`${refDate}`);

    topUpPaymentRecordsRef.add({
      "stripeObject": resultingData,
    });

    return stripe.customers.createBalanceTransaction(
        CUSTOMER_ID,
        {amount: -amount,
          currency: currency,
          description: `Top-up on ${refDate}`,
        }).then((results) => {
      resultingBalanceTransactionData = JSON.parse(JSON.stringify(results));

      balanceTransactionRecordsRef = fs.collection("userData")
          .doc(userID)
          .collection("allUserDocuments")
          .doc("balanceTransactions")
          .collection(`${refDate}`);

      balanceTransactionRecordsRef.add({
        "balanceTransactionRecord": resultingBalanceTransactionData,
        "stripePaymentObject": resultingData,
      });

      balanceTransactionRecordRefTwo = fs.collection("userData")
          .doc(userID)
          .collection("allUserDocuments")
          .doc("lastBalanceTransaction");

      balanceTransactionRecordRefTwo.set({
        resultingBalanceTransactionData,
      });

      lastBalanceTransactionStatusRef = fs.collection("userData")
          .doc(userID)
          .collection("allUserDocuments")
          .doc("balanceTransactionRef");

      lastBalanceTransactionStatusRef.set({
        "status": "success",
        "refDate": refDate,
      });

      console.log("Document successfully updated!", results);
      return {text: "success"};
    }).catch((err) => {
      errorData = JSON.parse(JSON.stringify(err));

      lastBalanceTransactionStatusRef = fs.collection("userData")
          .doc(userID)
          .collection("allUserDocuments")
          .doc("balanceTransactionRef");

      lastBalanceTransactionStatusRef.set({
        "status": "failure",
        "refDate": refDate,
      });

      docRef = fs.collection("userData")
          .doc(userID)
          .collection("allUserDocuments")
          .doc("balanceTransactions")
          .collection("creationErrors");


      console.log("customerCreationError", resultingData);
      docRef.add({
        "error": errorData,
      });
      console.log("Error code is: ", err.code);
      return {text: "Invalid Auth Code 2"};
    });
  }).catch((err) => {
    topUpPaymentRef = fs.collection("userData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("topUpPaymentRef");

    topUpPaymentRef.set({
      "status": "failure",
      "refDate": refDate,
    });

    docRef = fs.collection("userData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("balanceTransactions")
        .collection("topUpPaymentErrors");

    resultingData = JSON.parse(JSON.stringify(err));
    console.log("customerCreationError", resultingData);
    docRef.add({
      "error": resultingData,
    });
    console.log("Error code is: ", err.code);
    return {text: "Invalid Auth Code 2"};
  });
});


exports.departureFareQuery = functions.https.onCall((data, context) => {
  const destination = data.destination;
  const userID = data.userID;
  const origin = data.origin;
  const currency = data.currency;
  const departureDate = data.departureDate;

  // let tripQueryQuickRef;
  let errorRef;

  return amadeus.shopping.flightOffersSearch.get({
    originLocationCode: `${origin}`,
    destinationLocationCode: `${destination}`,
    departureDate: `${departureDate}`, // YYYY-MM-DD
    travelClass: "ECONOMY",
    currencyCode: `${currency}`,
    nonStop: true,
    adults: "1",
    max: 1,

  }).then(function(response) {
    // const resp1 = response.data[0];
    const resp1 = JSON.parse(JSON.stringify(response.data[0]));
    const resp3 = resp1["itineraries"];
    const resp4 = resp3[0];
    const resp5 = resp4["segments"];
    const segmentDetails = resp5[0];
    const aircraft = segmentDetails["aircraft"];
    const departureData = segmentDetails["departure"];
    const arrivalData = segmentDetails["arrival"];
    const departureTimeString = departureData["at"];
    const arrivalTimeString = arrivalData["at"];
    const departureArr = departureTimeString.split("T");
    const arrivalArr = arrivalTimeString.split("T");
    const priceObject = resp1["price"];

    let departureTerminal;
    let arrivalTerminal;
    let grandTotal = priceObject["grandTotal"];
    const currency = priceObject["currency"];
    const validatingAirlineCode = segmentDetails["carrierCode"];
    const flightNumber = segmentDetails["number"];

    if (typeof departureData["terminal"] === "undefined") {
      departureTerminal = "1";
    } else {
      departureTerminal = departureData["terminal"];
    }

    if (typeof arrivalData["terminal"] === "undefined") {
      arrivalTerminal = "1";
    } else {
      arrivalTerminal = arrivalData["terminal"];
    }

    const departureTime = departureArr[1];
    const arrivalTime = arrivalArr[1];
    const departureDate = departureArr[0];
    const arrivalDate = arrivalArr[0];
    const aircraftType = aircraft["code"];

    return amadeus.referenceData.airlines.get({
      airlineCodes: validatingAirlineCode,
    }).then(function(response) {
      const rps1 = response.data[0];
      const airlineName = rps1["businessName"];

      if (destination === "CUN") {
        if (grandTotal >= 200) {
          if (origin === "YVR" || origin === "YYZ" || origin === "YUL") {
            grandTotal = "200";
          }
        }
      }


      console.log(airlineName);
      return {
        validatingAirlineCode,
        aircraftType,
        airlineName,
        currency,
        "flightPrice": grandTotal,
        arrivalDate,
        arrivalTime,
        flightNumber,
        "arrivalAirport": `${destination}`,
        "departureAirport": `${origin}`,
        departureTerminal,
        arrivalTerminal,
        departureDate,
        departureTime,
        "fareClassDescription": "Economy",
      };

      // console.log("\n\n\n");
    }).catch(function(responseError) {
      console.log(responseError.code);
      console.log(responseError);

      errorRef = fs.collection("userData")
          .doc(userID)
          .collection("allUserDocuments")
          .doc("amadeusErrorsDepartureFareQuery");

      const err = JSON.parse(JSON.stringify(responseError));

      errorRef.set({
        err,
      });

      return "error";
    });
  }).catch(function(responseError) {
    console.log(responseError.code);
    console.log(responseError);

    errorRef = fs.collection("userData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("amadeusErrorsDepartureFareQuery");

    const err = JSON.parse(JSON.stringify(responseError));

    errorRef.set({
      err,
    });

    return "error";
  });
});

exports.returnFareQuery = functions.https.onCall((data, context) => {
  const destination = data.destination;
  const userID = data.userID;
  const origin = data.origin;
  const currency = data.currency;
  const returnDate = data.returnDate;

  // let tripQueryQuickRef;
  let errorRef;

  return amadeus.shopping.flightOffersSearch.get({
    originLocationCode: `${origin}`,
    destinationLocationCode: `${destination}`,
    departureDate: `${returnDate}`, // YYYY-MM-DD
    travelClass: "ECONOMY",
    currencyCode: `${currency}`,
    nonStop: true,
    adults: "1",
    max: 1,

  }).then(function(response) {
    const resp1 = JSON.parse(JSON.stringify(response.data[0]));
    const resp3 = resp1["itineraries"];
    const resp4 = resp3[0];
    const resp5 = resp4["segments"];
    const segmentDetails = resp5[0];
    const aircraft = segmentDetails["aircraft"];
    const departureData = segmentDetails["departure"];
    const arrivalData = segmentDetails["arrival"];
    const departureTimeString = departureData["at"];
    const arrivalTimeString = arrivalData["at"];
    const departureArr = departureTimeString.split("T");
    const arrivalArr = arrivalTimeString.split("T");
    const priceObject = resp1["price"];

    let departureTerminal;
    let arrivalTerminal;
    let grandTotal = priceObject["grandTotal"];
    const currency = priceObject["currency"];
    const validatingAirlineCode = segmentDetails["carrierCode"];
    const flightNumber = segmentDetails["number"];


    if (typeof departureData["terminal"] === "undefined") {
      departureTerminal = "1";
    } else {
      departureTerminal = departureData["terminal"];
    }

    if (typeof arrivalData["terminal"] === "undefined") {
      arrivalTerminal = "1";
    } else {
      arrivalTerminal = arrivalData["terminal"];
    }

    const departureTime = departureArr[1];
    const arrivalTime = arrivalArr[1];
    const departureDate = departureArr[0];
    const arrivalDate = arrivalArr[0];
    const aircraftType = aircraft["code"];


    return amadeus.referenceData.airlines.get({
      airlineCodes: validatingAirlineCode,
    }).then(function(response) {
      const rps1 = response.data[0];
      const airlineName = rps1["businessName"];

      if (destination === "CUN") {
        if (grandTotal >= 200) {
          if (origin === "YVR" || origin === "YYZ" || origin === "YUL") {
            grandTotal = "200";
          }
        }
      }

      console.log(airlineName);
      return {airlineName,
        validatingAirlineCode,
        aircraftType,
        currency,
        "flightPrice": grandTotal,
        arrivalDate,
        arrivalTime,
        flightNumber,
        "arrivalAirport": `${destination}`,
        "departureAirport": `${origin}`,
        departureTerminal,
        arrivalTerminal,
        departureDate,
        departureTime,
        "fareClassDescription": "Economy"};
      // console.log("\n\n\n");
    }).catch(function(responseError) {
      console.log(responseError.code);
      console.log(responseError);

      errorRef = fs.collection("userData")
          .doc(userID)
          .collection("allUserDocuments")
          .doc("amadeusErrorsReturnFareQuery");


      const err = JSON.parse(JSON.stringify(responseError));
      errorRef.set({
        err,
      });

      return "error";
    });
  }).catch(function(responseError) {
    console.log(responseError.code);
    console.log(responseError);

    errorRef = fs.collection("userData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("amadeusErrorsReturnFareQuery");


    const err = JSON.parse(JSON.stringify(responseError));
    errorRef.set({
      err,
    });

    return "error";
  });
});

exports.retrieveBalanceTransactionPayments = functions.https.onCall((data, context) => {
  const CUSTOMER_ID = data.cus;
  const userID = data.userID;

  const today = new Date();
  let dd = today.getDate();
  let mm = today.getMonth() + 1; // January is 0!

  // const yyyy = today.getFullYear();
  if (dd < 10) {
    dd = "0" + dd;
  }
  if (mm < 10) {
    mm = "0" + mm;
  }
  // const refDate = yyyy + "." + mm + "." + dd;


  let resultingData;
  let balanceTransactionRecordsRef;
  let errorRef;
  let resultingBalanceTransactionData;

  return stripe.customers.listBalanceTransactions(
      CUSTOMER_ID
  ).then((results) => {
    resultingBalanceTransactionData = JSON.parse(JSON.stringify(results));

    balanceTransactionRecordsRef = fs.collection("userData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("stripeBalanceTransactions");

    balanceTransactionRecordsRef.set({
      "balanceTransactionRecord": resultingBalanceTransactionData,
    });

    console.log("Document successfully updated!", results);
    return {text: "success"};
  }).catch((err) => {
    errorRef = fs.collection("userData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("RetrievalErrors")
        .collection("stripeBalanceTransactions");

    resultingData = JSON.parse(JSON.stringify(err));
    console.log("customerCreationError", resultingData);
    errorRef.add({
      "error": resultingData,
    });

    console.log("Error code is: ", err.code);
    return {text: "error"};
  });
});

// exports.retrieveTopUpPaymentBalance = functions.https.onCall((data, context) => {
//   const BALANCE_TRANSACTION_ID = data.bt;
//   const CUSTOMER_ID = data.cus;
//   const userID = data.userID;

//   const today = new Date();
//   let dd = today.getDate();
//   let mm = today.getMonth() + 1; // January is 0!

//   // const yyyy = today.getFullYear();
//   if (dd < 10) {
//     dd = "0" + dd;
//   }
//   if (mm < 10) {
//     mm = "0" + mm;
//   }
//   // const refDate = yyyy + "." + mm + "." + dd;


//   let resultingData;
//   let balanceTransactionRecordsRef;
//   let errorRef;

//   return stripe.customers.retrieveBalanceTransaction(
//       CUSTOMER_ID,
//       BALANCE_TRANSACTION_ID
//   ).then((results) => {
//     resultingData = JSON.parse(JSON.stringify(results));

//     balanceTransactionRecordsRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("balanceTransactions")
//         .collection("lastTopUpTransaction");

//     balanceTransactionRecordsRef.set({
//       resultingData,
//     });
//   }).catch((err) => {
//     errorRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("balanceTransactions")
//         .collection("RetrievalErrors");

//     resultingData = JSON.parse(JSON.stringify(err));
//     console.log("customerCreationError", resultingData);
//     errorRef.add({
//       "error": resultingData,
//     });

//     console.log("Error code is: ", err.code);
//     return {text: "error"};
//   });
// });

// exports.makeZerojetPartnerPayment = functions.https.onCall((data, context) => {

//   const CUSTOMER_ID = data.cus;
//   const userID = data.userID;
//   const amount = data.amount;
//   const currency = data.currency;

//   const today = new Date();
//   let dd = today.getDate();
//   let mm = today.getMonth() + 1; // January is 0!

//   const yyyy = today.getFullYear();
//   if (dd < 10) {
//     dd = "0" + dd;
//   }
//   if (mm < 10) {
//     mm = "0" + mm;
//   }
//   const refDate = yyyy + "." + mm + "." + dd;


//   let resultingData;
//   let resultingBalanceTransactionData;
//   let docRef;
//   let topUpPaymentRef;
//   let balanceTransactionRecordsRef;
//   let balanceTransactionRecordRefTwo;

//   return stripe.customers.createBalanceTransaction(
//     CUSTOMER_ID,
//     {amount: amount,
//       currency: currency,
//       description: "paymentID"
//     }).then((results) => {
//   resultingBalanceTransactionData = JSON.parse(JSON.stringify(results));

//   balanceTransactionRecordsRef = fs.collection("userData")
//       .doc(userID)
//       .collection("allUserDocuments")
//       .doc("balanceTransactions")
//       .collection(`${refDate}`);

//   balanceTransactionRecordsRef.add({
//     "balanceTransactionRecord": resultingBalanceTransactionData,
//   });

//   balanceTransactionRecordRefTwo = fs.collection("userData")
//       .doc(userID)
//       .collection("allUserDocuments")
//       .doc("balanceTransactions")
//       .collection("lastTopUpTransaction");

//   balanceTransactionRecordRefTwo.set({
//     "balanceTransactionRecord": resultingBalanceTransactionData,
//   });

//   console.log("Document successfully updated!", results);
//   return {text: "success"};
// }).catch((err) => {
//   docRef = fs.collection("userData")
//       .doc(userID)
//       .collection("allUserDocuments")
//       .doc("balanceTransactions")
//       .collection("topUpPaymentErrors");

//   topUpPaymentRef = fs.collection("userData")
//       .doc(userID)
//       .collection("allUserDocuments")
//       .doc("topUpPaymentRef");

//   topUpPaymentRef.set({
//     "status": "failure",
//     "refDate": refDate,
//   });


//   resultingData = JSON.parse(JSON.stringify(err));
//   console.log("customerCreationError", resultingData);
//   docRef.add({
//     "error": resultingData,
//   });
//   console.log("Error code is: ", err.code);
//   return {text: "Invalid Auth Code 2"};
// });

// });




// exports.bookRoomDepositayment = functions.https.onCall((data, context) => {
//   const PAYMENT_METHOD_ID = data.pm;
//   const CUSTOMER_ID = data.cus;
//   const userID = data.userID;
//   const depositAmount = data.depositAmount;
//   const depositCurrency = data.depositCurrency;

//   const today = new Date();
//   let dd = today.getDate();
//   let mm = today.getMonth() + 1; // January is 0!

//   const yyyy = today.getFullYear();
//   if (dd < 10) {
//     dd = "0" + dd;
//   }
//   if (mm < 10) {
//     mm = "0" + mm;
//   }
//   const refDate = yyyy + "." + mm + "." + dd;


//   let resultingData;
//   let docRef;
//   let depositPaymentRef;

//   return stripe.paymentIntents.create({
//     amount: depositAmount, // $1 = 100, $10 = 1000
//     currency: depositCurrency,
//     customer: CUSTOMER_ID,
//     payment_method: PAYMENT_METHOD_ID,
//     error_on_requires_action: true,
//     confirm: true,
//   }).then((results) => {
//     depositPaymentRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("depositPaymentRef");

//     depositPaymentRef.set({
//       "status": "success",
//       "refDate": refDate,
//     });

//     console.log("Document successfully updated!", results);
//     return {text: "success"};
//   }).catch((err) => {
//     docRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("Payments")
//         .collection("Errors");

//     depositPaymentRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("depositPaymentRef");

//     depositPaymentRef.set({
//       "status": "failure",
//       "refDate": refDate,
//     });


//     resultingData = JSON.parse(JSON.stringify(err));
//     console.log("customerCreationError", resultingData);
//     docRef.add({
//       "error": resultingData,
//     });
//     console.log("Error code is: ", err.code);
//     return {text: "Invalid Auth Code 2"};
//   });
// });
