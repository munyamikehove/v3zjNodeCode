/* jshint esversion: 8 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const moment = require("moment");
const Amadeus = require("amadeus");
const sgMail = require("@sendgrid/mail");


// const secondaryAppConfig = {
//   credential: admin.credential.cert(partnerServiceAccount),
//   databaseURL: "https://zerojet-partners-default-rtdb.firebaseio.com",
// };

// const secondary = admin.initializeApp(secondaryAppConfig, "secondary");

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

exports.departureFareQuery = functions.https.onCall((data, context) => {
  const destination = data.destination;
  const userID = data.userID;
  const origin = data.origin;
  const currency = data.currency;
  const departureDate = data.departureDate;
  const date = moment(departureDate);
  const dod = date.day();
  let grandTotal;

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
    grandTotal = priceObject["grandTotal"];


    if (destination === "CUN" && origin === "YVR") {
      if (grandTotal >= 121) {
        grandTotal = "120";
      }
    }

    if (destination === "YYZ") {
      if (dod === 4 || dod === 5) {
        if (grandTotal >= 60) {
          grandTotal = "50";
        }
      }
    }


    let departureTerminal;
    let arrivalTerminal;

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
        responseError,
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
      responseError,
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
  const date = moment(returnDate);
  const dor = date.day();
  let grandTotal;

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
    grandTotal = priceObject["grandTotal"];

    if (destination === "YVR" && origin === "CUN") {
      if (grandTotal >= 121) {
        grandTotal = "120";
      }
    }


    if (destination === "YQB" || destination === "YUL") {
      if (dor === 1 || dor === 7) {
        if (grandTotal >= 60) {
          grandTotal = "50";
        }
      }
    }


    const currency = priceObject["currency"];
    const validatingAirlineCode = segmentDetails["carrierCode"];
    const flightNumber = segmentDetails["number"];

    let departureTerminal;
    let arrivalTerminal;

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
        responseError,
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
      responseError,
    });

    return "error";
  });
});

exports.nonMemberFlightReservation = functions.firestore
    .document("nonMemberFlightReservations/quickRef/{userId}/currentReservation")
    .onCreate((snap, context) => {
      const reservationData = snap.data();
      const userEmail = reservationData.userEmail;
      const firstName = reservationData.firstName;
      const lastName = reservationData.lastName;
      const DOB = reservationData.userDOB;
      const DSR = reservationData.DSR;
      const destination = reservationData.Destination;
      const origin = reservationData.Origin;
      const departureAirline = reservationData.DepartureFlightAirline;
      const departureFlightNumber = reservationData.DepartureFlight_flightNumber;
      const departureLeaveDate = reservationData.departureDate;
      const departureLeaveTime = reservationData.DepartureFlightDepartureTime;
      const departureLeaveAirport = reservationData.DepartureFlight_departureAirport;
      const departureArrivalDate = reservationData.departureDate;
      const departureArrivalTime = reservationData.DepartureFlightArrivalTime;
      const departureArrivalAirport = reservationData.DepartureFlight_arrivalAirport;
      const returnAirline = reservationData.ReturnFlightAirline;
      const returnFlightNumber = reservationData.ReturnFlight_flightNumber;
      const returnLeaveDate = reservationData.returnDate;
      const returnLeaveTime = reservationData.ReturnFlightDepartureTime;
      const returnLeaveAirport = reservationData.ReturnFlight_departureAirport;
      const returnArrivalDate = reservationData.returnDate;
      const returnArrivalTime = reservationData.ReturnFlightArrivalTime;
      const returnArrivalAirport = reservationData.ReturnFlight_arrivalAirport;

      const msg = {
        to: `${userEmail}`,
        from: {
          email: "reservations@zerojet.com",
          name: "Zerojet",
        },
        subject: "Zerojet flight reservation",
        html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml"><head>
<title></title>
<meta content="text/html; charset=utf-8" http-equiv="Content-Type"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
<style>
		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			padding: 0;
		}

		a[x-apple-data-detectors] {
			color: inherit !important;
			text-decoration: inherit !important;
		}

		#MessageViewBody a {
			color: inherit;
			text-decoration: none;
		}

		p {
			line-height: inherit
		}

		@media (max-width:720px) {
			.desktop_hide table.icons-inner {
				display: inline-block !important;
			}

			.icons-inner {
				text-align: center;
			}

			.icons-inner td {
				margin: 0 auto;
			}

			.row-content {
				width: 100% !important;
			}

			.image_block img.big {
				width: auto !important;
			}

			.column .border,
			.mobile_hide {
				display: none;
			}

			.stack .column {
				width: 100%;
				display: block;
			}

			.mobile_hide {
				min-height: 0;
				max-height: 0;
				max-width: 0;
				overflow: hidden;
				font-size: 0px;
			}

			.desktop_hide,
			.desktop_hide table {
				display: table !important;
				max-height: none !important;
			}
		}
	</style>
</head>
<body style="background-color: #f9f9f9; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
<table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f9f9f9;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td style="width:100%;padding-right:0px;padding-left:0px;">
<div align="center" style="line-height:10px"><img class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fimage-2-removebg-preview.png?alt=media&token=beee05a5-fc40-4d18-af62-d7fdf9d8b5b2" style="display: block; height: auto; border: 0; width: 700px; max-width: 100%;" width="700"/></div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td style="width:100%;padding-right:0px;padding-left:0px;">
<div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fhero_Image.png?alt=media&token=dd187c41-e4fd-4468-acbc-4ea8118003ed" style="display: block; height: auto; border: 0; width: 700px; max-width: 100%;" title="Alternate text" width="700"/></div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:25px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif; mso-line-height-alt: 14.399999999999999px; color: #0b1560; line-height: 1.2;">
<p style="margin: 0; font-size: 16px; text-align: center;"><span style="font-size:34px;"><strong>Congratulations on reserving your free flight!</strong></span></p>
</div>
</div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f5f5f5; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:10px;padding-left:10px;padding-right:10px;padding-top:45px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #0b1560; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:24px;"><strong>YOUR RESERVATION</strong></span></p>
</div>
</div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-5" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f5f5f5; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; mso-line-height-alt: 16.8px;"> </p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:45px;padding-left:10px;padding-right:10px;padding-top:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: left;"><span style="font-size:20px;"><strong>Passenger information<br/></strong></span>First Name: ${firstName}<br/>Last Name: ${lastName}</p>
<p style="margin: 0; font-size: 14px; text-align: left;">DOB: ${DOB}</p>
<p style="margin: 0; font-size: 14px; text-align: left;">ADS: Spend an average of ${DSR} daily in ${destination}. Track your ADS through the Zerojet mobile app.</p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:20px;"><strong>Departure flight<br/></strong></span>${departureAirline} - Economy<br/>Flight number ${departureFlightNumber}</p>
</div>
</div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-6" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f5f5f5; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-left:10px;padding-right:10px;padding-top:5px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;"><strong><span style="font-size:18px;">${origin}</span></strong></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:5px;padding-left:10px;padding-right:10px;padding-top:5px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 12px; text-align: center;"><span style="font-size:14px;">${departureLeaveDate}</span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:5px;padding-left:10px;padding-right:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;font-size:14px;"><span style="">${departureLeaveTime}</span></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:10px;padding-left:10px;padding-right:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;font-size:14px;"><span style="">${departureLeaveAirport}</span></span></p>
</div>
</div>
</td>
</tr>
</table>
</td>
<td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
<table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td style="width:100%;padding-right:0px;padding-left:0px;padding-top:5px;padding-bottom:40px;">
<div align="center" style="line-height:10px"><img alt="Alternate text" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Ficons8-airplane-mode-on-50_1_.png?alt=media&token=bdbf7a2b-cf5c-4fa7-8a80-dd3cc440dfc9" style="display: block; height: auto; border: 0; width: 50px; max-width: 100%;" title="Alternate text" width="50"/></div>
</td>
</tr>
</table>
</td>
<td class="column column-3" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-left:10px;padding-right:10px;padding-top:5px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;"><span style="font-size:18px;">${destination}</span></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:5px;padding-left:10px;padding-right:10px;padding-top:5px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;font-size:14px;"><span style="">${departureArrivalDate}</span></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:5px;padding-left:10px;padding-right:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;font-size:14px;"><span style="">${departureArrivalTime}</span></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:10px;padding-left:10px;padding-right:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;">${departureArrivalAirport}</p>
</div>
</div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-7" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f5f5f5; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; mso-line-height-alt: 16.8px;"> </p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; mso-line-height-alt: 16.8px;"> </p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:20px;"><strong>Return flight<br/></strong></span>${returnAirline} - Economy<br/>Flight number ${returnFlightNumber}</p>
</div>
</div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-8" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f5f5f5; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-left:10px;padding-right:10px;padding-top:5px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;"><strong><span style="font-size:18px;">${origin}</span></strong></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:5px;padding-left:10px;padding-right:10px;padding-top:5px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 12px; text-align: center;"><span style="font-size:14px;">${returnArrivalDate}</span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:5px;padding-left:10px;padding-right:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;font-size:14px;"><span style="">${returnArrivalTime}</span></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:10px;padding-left:10px;padding-right:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;font-size:14px;"><span style="">${returnArrivalAirport}</span></span></p>
</div>
</div>
</td>
</tr>
</table>
</td>
<td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
<table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td style="width:100%;padding-right:0px;padding-left:0px;padding-top:5px;padding-bottom:40px;">
<div align="center" style="line-height:10px"><img alt="Alternate text" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fc0a398ee-afca-4333-ac19-d47e4fb0d18e.png?alt=media&token=ab7ae2dd-1574-4819-ba62-51d16ac423a3" style="display: block; height: auto; border: 0; width: 50px; max-width: 100%;" title="Alternate text" width="50"/></div>
</td>
</tr>
</table>
</td>
<td class="column column-3" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-left:10px;padding-right:10px;padding-top:5px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;"><span style="font-size:18px;">${destination}</span></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:5px;padding-left:10px;padding-right:10px;padding-top:5px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;font-size:14px;"><span style="">${returnLeaveDate}</span></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:5px;padding-left:10px;padding-right:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;font-size:14px;"><span style="">${returnLeaveTime}</span></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:10px;padding-left:10px;padding-right:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;">${returnLeaveAirport}</p>
</div>
</div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-9" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f6f6f6; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; mso-line-height-alt: 16.8px;"> </p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-left:10px;padding-right:10px;padding-top:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #0b1560; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:24px;"><strong>Important - your flights have not yet been confirmed.</strong></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:10px;padding-left:10px;padding-right:10px;padding-top:5px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #0b1560; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style=""><span style=""><strong><span style="font-size:14px;">Unconfirmed flights expire 24 hours after a reservation is made.</span></strong></span></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; mso-line-height-alt: 16.8px;"> </p>
</div>
</div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-10" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:24px;"><strong><span style="">How to confirm your flights</span></strong></span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;">In order to travel with Zerojet, you need to subscribe to a travel plan. You can subscribe to a travel plan below or by visiting <a href="https://www.zerojet.com">www.zerojet.com</a>.</p>
<p style="margin: 0; font-size: 14px; text-align: center;"><br/>Once you subscribe to a travel plan, we will send you an email with your booking confirmation and flight reservation number.</p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;"> </p>
</div>
</div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-11" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:5px;padding-left:10px;padding-right:10px;padding-top:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><u><span style="font-size:18px;"><span style="color:#000000;">Zerojet Travel Plans<br/></span><br/></span></u><span style="font-size:14px;">Available in Canada, and the USA.<br/>If you travel two or more times during your first year as a member, your membership is free the following year.</span><u><span style="font-size:18px;"><br/></span></u></p>
</div>
</div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-12" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
<div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;"> </div>
<div class="spacer_block desktop_hide" style="mso-hide: all; display: none; max-height: 0; overflow: hidden; height: 30px; line-height: 30px; font-size: 1px;"> </div>
<table border="0" cellpadding="10" cellspacing="0" class="divider_block mobile_hide" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td>
<div align="center">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #BBBBBB;"><span> </span></td>
</tr>
</table>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:18px;">Student traveller</span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="color:#000000;font-size:30px;">$9.99</span>/mo<br/>Billed annually</p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="divider_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td>
<div align="center">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 01px solid #F2F2F2;"><span> </span></td>
</tr>
</table>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px;"><span style="color:#000000;">WHAT'S INCLUDED?</span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px;">Free flights to any Zerojet destination</p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px;">Economy class flights with 1 carry-on bag</p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="button_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td>
<div align="center">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://buy.stripe.com/28o8xmeXagoiewE4gk" style="height:42px;width:101px;v-text-anchor:middle;" arcsize="10%" stroke="false" fillcolor="#0b1560"><w:anchorlock/><v:textbox inset="0px,0px,0px,0px"><center style="color:#ffffff; font-family:Tahoma, sans-serif; font-size:16px"><![endif]--><a href="https://buy.stripe.com/28o8xmeXagoiewE4gk" style="text-decoration:none;display:inline-block;color:#ffffff;background-color:#0b1560;border-radius:4px;width:auto;border-top:1px solid #0b1560;border-right:1px solid #0b1560;border-bottom:1px solid #0b1560;border-left:1px solid #0b1560;padding-top:5px;padding-bottom:5px;font-family:Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;" target="_blank"><span style="padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;"><span style="font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;">Subscribe</span></span></a>
<!--[if mso]></center></v:textbox></v:roundrect><![endif]-->
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="divider_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td style="padding-top:10px;padding-right:10px;padding-bottom:15px;padding-left:10px;">
<div align="center">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #BBBBBB;"><span> </span></td>
</tr>
</table>
</div>
</td>
</tr>
</table>
</td>
<td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
<div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;"> </div>
<div class="spacer_block desktop_hide" style="mso-hide: all; display: none; max-height: 0; overflow: hidden; height: 15px; line-height: 15px; font-size: 1px;"> </div>
<table border="0" cellpadding="10" cellspacing="0" class="divider_block mobile_hide" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td>
<div align="center">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #BBBBBB;"><span> </span></td>
</tr>
</table>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:18px;">International traveller</span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:30px;color:#000000;">$12.99</span>/mo<br/>Billed annually</p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="divider_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td>
<div align="center">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #F2F2F2;"><span> </span></td>
</tr>
</table>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px;"><span style="color:#000000;">WHAT'S INCLUDED?</span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px;">Free flights to any Zerojet destination</p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px;">Economy class flights with 1 carry-on bag</p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="button_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td>
<div align="center">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://buy.stripe.com/14kdRGbKY9ZUgEM5kr" style="height:42px;width:101px;v-text-anchor:middle;" arcsize="10%" stroke="false" fillcolor="#0b1560"><w:anchorlock/><v:textbox inset="0px,0px,0px,0px"><center style="color:#ffffff; font-family:Tahoma, sans-serif; font-size:16px"><![endif]--><a href="https://buy.stripe.com/14kdRGbKY9ZUgEM5kr" style="text-decoration:none;display:inline-block;color:#ffffff;background-color:#0b1560;border-radius:4px;width:auto;border-top:1px solid #0b1560;border-right:1px solid #0b1560;border-bottom:1px solid #0b1560;border-left:1px solid #0b1560;padding-top:5px;padding-bottom:5px;font-family:Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;" target="_blank"><span style="padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;"><span style="font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;">Subscribe</span></span></a>
<!--[if mso]></center></v:textbox></v:roundrect><![endif]-->
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="divider_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td style="padding-top:10px;padding-right:10px;padding-bottom:15px;padding-left:10px;">
<div align="center">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #BBBBBB;"><span> </span></td>
</tr>
</table>
</div>
</td>
</tr>
</table>
</td>
<td class="column column-3" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
<div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;"> </div>
<div class="spacer_block desktop_hide" style="mso-hide: all; display: none; max-height: 0; overflow: hidden; height: 15px; line-height: 15px; font-size: 1px;"> </div>
<table border="0" cellpadding="10" cellspacing="0" class="divider_block mobile_hide" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td>
<div align="center">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #BBBBBB;"><span> </span></td>
</tr>
</table>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:18px;">Elite traveller</span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:30px;color:#000000;">$27.99</span>/mo<br/>Billed annually</p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="divider_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td>
<div align="center">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #F2F2F2;"><span> </span></td>
</tr>
</table>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px;"><span style="color:#000000;">WHAT'S INCLUDED?</span></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px;">Free flights to any Zerojet destination</p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td>
<div style="font-family: sans-serif">
<div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #555555; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
<p style="margin: 0; font-size: 14px;">Economy class flights with 1 carry-on bag and 1 checked bag </p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="10" cellspacing="0" class="button_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td>
<div align="center">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://buy.stripe.com/eVa14U4iw3Bwago9AG" style="height:42px;width:101px;v-text-anchor:middle;" arcsize="10%" stroke="false" fillcolor="#0b1560"><w:anchorlock/><v:textbox inset="0px,0px,0px,0px"><center style="color:#ffffff; font-family:Tahoma, sans-serif; font-size:16px"><![endif]--><a href="https://buy.stripe.com/eVa14U4iw3Bwago9AG" style="text-decoration:none;display:inline-block;color:#ffffff;background-color:#0b1560;border-radius:4px;width:auto;border-top:1px solid #0b1560;border-right:1px solid #0b1560;border-bottom:1px solid #0b1560;border-left:1px solid #0b1560;padding-top:5px;padding-bottom:5px;font-family:Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;" target="_blank"><span style="padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;"><span style="font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;">Subscribe</span></span></a>
<!--[if mso]></center></v:textbox></v:roundrect><![endif]-->
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="divider_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td style="padding-top:10px;padding-right:10px;padding-bottom:15px;padding-left:10px;">
<div align="center">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #BBBBBB;"><span> </span></td>
</tr>
</table>
</div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-13" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;"> </div>
<div class="spacer_block mobile_hide" style="height:30px;line-height:30px;font-size:1px;"> </div>
<div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;"> </div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-14" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #dbdbdb; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<div class="spacer_block" style="height:25px;line-height:25px;font-size:1px;"> </div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-15" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #dbdbdb; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:10px;padding-left:25px;padding-right:10px;padding-top:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2;">
<p style="margin: 0; font-size: 18px; text-align: center;"><strong><span style="color:#000000;">Need help?</span></strong></p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
<tr>
<td style="padding-bottom:10px;padding-left:25px;padding-right:10px;padding-top:10px;">
<div style="font-family: sans-serif">
<div style="font-size: 12px; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif; mso-line-height-alt: 14.399999999999999px; color: #000000; line-height: 1.2;">
<p style="margin: 0; text-align: center;">Use the links below to send us an email or chat with one of our customer service agents.</p>
</div>
</div>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="social_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td style="text-align:left;padding-top:10px;padding-right:10px;padding-bottom:10px;padding-left:25px;">
<table align="center" border="0" cellpadding="0" cellspacing="0" class="social-table" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="104px">
<tr>
<td style="padding:0 20px 0 0;"><a href="https://wa.me/16479157325" target="_blank"><img alt="WhatsApp" height="32" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fwhatsapp2x.png?alt=media&token=6160f4c7-428b-42ca-843b-333c6cd71256" style="display: block; height: auto; border: 0;" title="WhatsApp" width="32"/></a></td>
<td style="padding:0 20px 0 0;"><a href="mailto:support@zerojet.com" target="_blank"><img alt="E-Mail" height="32" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fmail2x.png?alt=media&token=80a72ae9-e946-458a-b8ca-1b3d6f91aa79" style="display: block; height: auto; border: 0;" title="E-Mail" width="32"/></a></td>
</tr>
</table>
</td>
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" class="html_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td>
<div align="center" style="font-family:Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;text-align:center;"><div style="height:20px;"> </div></div>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-16" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #dbdbdb; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<div class="spacer_block" style="height:25px;line-height:25px;font-size:1px;"> </div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-17" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tbody>
<tr>
<td>
<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 700px;" width="700">
<tbody>
<tr>
<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
<table border="0" cellpadding="0" cellspacing="0" class="icons_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td style="vertical-align: middle; padding-bottom: 5px; padding-top: 5px; color: #9d9d9d; font-family: inherit; font-size: 15px; text-align: center;">
<table cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
<tr>
<td style="vertical-align: middle; text-align: center;">
<!--[if vml]><table align="left" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0px;padding-right:0px;mso-table-lspace: 0pt;mso-table-rspace: 0pt;"><![endif]-->
<!--[if !vml]><!-->
<table cellpadding="0" cellspacing="0" class="icons-inner" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block; margin-right: -4px; padding-left: 0px; padding-right: 0px;">
<!--<![endif]-->
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table><!-- End -->
</body>
</html>`,
      };


      sgMail.send(msg)
          .then(() => {
            console.log("Reservation email sent");
          })
          .catch((error) => {
            console.error(error);
          });
    });

exports.MemberFlightBooking = functions.firestore
    .document("flightReservations/quickRef/{userId}/currentReservation")
    .onUpdate((change, context) => {
      const newValue = change.after.data();
      // const previousValue = change.before.data();

      const accountStatus = newValue.accountStatus;
      const departureReservationNumber = newValue.departureFlightReservationNumber;
      const returnReservationNumber = newValue.returnFlightReservationNumber;
      let checkedBagCount = 0;


      if (accountStatus !== 0) {
        const userEmail = newValue.userEmail;
        const firstName = newValue.firstName;
        const lastName = newValue.lastName;
        const userPhoneNumber = newValue.userPhoneNumber;
        const DOB = newValue.userDOB;
        const DSR = newValue.DSR;
        const departureFlightPNR = newValue.departureFlightPNR;
        const returnFlightPNR = newValue.returnFlightPNR;
        const destination = newValue.Destination;
        const origin = newValue.Origin;
        const departureAirlineName = newValue.DepartureFlightAirline;
        const departureFlightNumber = newValue.DepartureFlight_flightNumber;
        const departureLeaveDate = newValue.departureDate;
        const departureLeaveTime = newValue.DepartureFlightDepartureTime;
        const departureLeaveAirport = newValue.DepartureFlight_departureAirport;
        const departureArriveDate = newValue.departureDate;
        const departureArriveTime = newValue.DepartureFlightArrivalTime;
        const departureArriveAirport = newValue.DepartureFlight_arrivalAirport;
        const returnAirlineName = newValue.ReturnFlightAirline;
        const returnFlightNumber = newValue.ReturnFlight_flightNumber;
        const returnLeaveDate = newValue.returnDate;
        const returnLeaveTime = newValue.ReturnFlightDepartureTime;
        const returnLeaveAirport = newValue.ReturnFlight_departureAirport;
        const returnArriveDate = newValue.returnDate;
        const returnArriveTime = newValue.ReturnFlightArrivalTime;
        const returnArriveAirport = newValue.ReturnFlight_arrivalAirport;
        const departureCheckInOnlineURL = newValue.departureFlightOnlineCheckin;
        const returnCheckInOnlineURL = newValue.returnFlightOnlineCheckin;

        if (accountStatus === 3) {
          checkedBagCount = 1;
          // console.log(`${checkedBagCount} checked bags`);
        } else {
          checkedBagCount = 0;
          // console.log(`${checkedBagCount} checked bags`);
        }


        if (departureReservationNumber !== "none" && returnReservationNumber === "none") {
          console.log("sending departure email");
          const msg = {
            to: `${userEmail}`,
            from: {
              email: "bookings@zerojet.com",
              name: "Zerojet",
            },
            subject: "Departure flight confirmation",
            html: `<!DOCTYPE html><html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
            <head>
            <title></title>
            <meta content="text/html; charset=utf-8" http-equiv="Content-Type"/>
            <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
            <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
            <style>
                * {
                  box-sizing: border-box;
                }
            
                body {
                  margin: 0;
                  padding: 0;
                }
            
                a[x-apple-data-detectors] {
                  color: inherit !important;
                  text-decoration: inherit !important;
                }
            
                #MessageViewBody a {
                  color: inherit;
                  text-decoration: none;
                }
            
                p {
                  line-height: inherit
                }
            
                @media (max-width:570px) {
                  .icons-inner {
                    text-align: center;
                  }
            
                  .icons-inner td {
                    margin: 0 auto;
                  }
            
                  .row-content {
                    width: 100% !important;
                  }
            
                  .image_block img.big {
                    width: auto !important;
                  }
            
                  .column .border {
                    display: none;
                  }
            
                  .stack .column {
                    width: 100%;
                    display: block;
                  }
                }
              </style>
            </head>
            <body style="background-color: #f9f9f9; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
            <table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f9f9f9;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fimage-2-removebg-preview.png?alt=media&token=beee05a5-fc40-4d18-af62-d7fdf9d8b5b2" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fround_corners_2.png?alt=media&token=444af699-d9ff-46c5-bf7d-9c07d4171c36" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f5f5f5; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fhero_Image.png?alt=media&token=dd187c41-e4fd-4468-acbc-4ea8118003ed" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" width="550"/></div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:25px;padding-left:10px;padding-right:10px;padding-top:25px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #0b1560; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:22px;"><strong><span style="">Departure Flight Confirmation<br/></span></strong></span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fround_corners_2.png?alt=media&token=444af699-d9ff-46c5-bf7d-9c07d4171c36" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-5" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #0b1560; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:10px;padding-top:55px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:18px;"><strong>${origin}</strong></span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:45px;padding-left:10px;padding-right:10px;padding-top:10px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; text-align: center;"><span style="font-size:14px;">${departureLeaveDate}<br/>${departureLeaveTime}<br/>${departureLeaveAirport}</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;padding-top:65px;padding-bottom:5px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2F49aaa3f3-ba60-4e58-94f3-9613e8f612f3.png?alt=media&token=70a402cf-9cb5-40d5-89d3-daa975751799" style="display: block; height: auto; border: 0; width: 46px; max-width: 100%;" title="Alternate text" width="46"/></div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-3" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:10px;padding-top:55px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:18px;"><strong>${destination}</strong></span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:45px;padding-left:10px;padding-right:10px;padding-top:10px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; text-align: center;"><span style="font-size:14px;">${departureArriveDate}<br/>${departureArriveTime}<br/>${departureArriveAirport}</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-6" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #0b1560; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="10" cellspacing="0" class="divider_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td>
            <div align="center">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="90%">
            <tr>
            <td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #FFFFFF;"><span> </span></td>
            </tr>
            </table>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-8" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #0b1560; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;"> </div>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-9" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-11" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <div class="spacer_block" style="height:20px;line-height:20px;font-size:1px;"> </div>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-12" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fround_corners_2.png?alt=media&token=444af699-d9ff-46c5-bf7d-9c07d4171c36" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-13" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:10px;padding-left:35px;padding-right:10px;padding-top:10px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #0b1560; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px;"><span style="font-size:17px;">Booking Details</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-14" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Carrier<br/><br/>Flight Number</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${departureAirlineName}<br/><br/>${departureFlightNumber}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-15" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Departure date</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${departureLeaveDate}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-16" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Reservation number</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${departureReservationNumber}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-17" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">PNR</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 12px;">${departureFlightPNR}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-18" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Class</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Economy</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-19" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Luggage</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">1 x 10kg Carry-on bag</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:10px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">${checkedBagCount} x 23kg Checked bag</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-20" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Booking reference<br/><br/>ADS</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${departureReservationNumber}<br/><br/>Spend an average of ${DSR} daily in ${destination}. Track your ADS through the Zerojet mobile app.</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-21" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fround_corners_2.png?alt=media&token=444af699-d9ff-46c5-bf7d-9c07d4171c36" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-22" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:10px;padding-left:35px;padding-right:10px;padding-top:10px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #0b1560; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px;"><span style="font-size:17px;">Passenger Information</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-23" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">First name</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">${firstName}</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-24" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Last name</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">${lastName}</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-25" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Date of birth</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${DOB}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-26" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Email</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${userEmail}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-27" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Phone number</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${userPhoneNumber}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-28" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fround_corners_2.png?alt=media&token=444af699-d9ff-46c5-bf7d-9c07d4171c36" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:10px;padding-left:10px;padding-right:10px;padding-top:15px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 14px; mso-line-height-alt: 21px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: center;"><span style=""><strong><span style="font-size:14px;">You will receive an email with your return flight confirmation 48 hours before your return flight.</span></strong></span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fround_corners_2.png?alt=media&token=444af699-d9ff-46c5-bf7d-9c07d4171c36" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-29" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <div class="spacer_block" style="height:20px;line-height:20px;font-size:1px;"> </div>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-30" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="10" cellspacing="0" class="button_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td>
            <div align="center">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:42px;width:152px;v-text-anchor:middle;" arcsize="10%" stroke="false" fillcolor="#0068a5"><w:anchorlock/><v:textbox inset="0px,0px,0px,0px"><center style="color:#ffffff; font-family:Tahoma, sans-serif; font-size:16px"><![endif]-->
            <div style="text-decoration:none;display:inline-block;color:#ffffff;background-color:#0b1560;border-radius:4px;width:auto;border-top:1px solid #0b1560;border-right:1px solid #0b1560;border-bottom:1px solid #0b1560;border-left:1px solid #0b1560;padding-top:5px;padding-bottom:5px;font-family:Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;"><a href="${departureCheckInOnlineURL}"><span style="padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;"><span style="color:white; font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;">Check In Online</span></span></a></div>
            <!--[if mso]></center></v:textbox></v:roundrect><![endif]-->
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-31" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <div class="spacer_block" style="height:20px;line-height:20px;font-size:1px;"> </div>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-32" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fdown_round.png?alt=media&token=d21aa0d6-3e09-4611-90c6-ab307d695690" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-33" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="padding-bottom:15px;width:100%;padding-right:0px;padding-left:0px;padding-top:35px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Flogo.png?alt=media&token=7c93e2ee-cab5-479a-bf33-50c626713151" style="display: block; height: auto; border: 0; width: 138px; max-width: 100%;" title="Alternate text" width="138"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-34" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="10" cellspacing="0" class="divider_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td>
            <div align="center">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="95%">
            <tr>
            <td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px dashed #BBBBBB;"><span> </span></td>
            </tr>
            </table>
            </div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td>
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: center;"><strong><span style="color:#232323;font-size:15px;"><a href="#" rel="noopener" style="text-decoration:none;color:#232323;" target="_blank">Need Help?</a></span></strong><br/><span style="color:#232323;">Use the links below to send us an email or chat with one of our customer service agents.</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-35" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="10" cellspacing="0" class="social_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="social-table" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="84px">
            <tr>
            <td style="padding:0 5px 0 5px;"><a href="https://wa.me/16479157325" target="_blank"><img alt="WhatsApp" height="32" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fwhatsapp2x.png?alt=media&token=18a4a61f-96c0-48d5-9601-fd7afc953808" style="display: block; height: auto; border: 0;" title="WhatsApp" width="32"/></a></td>
            <td style="padding:0 5px 0 5px;"><a href="mailto:support@zerojet.com" target="_blank"><img alt="E-Mail" height="32" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fmail2x.png?alt=media&token=816b69b1-499a-4eee-94ac-7f9337a7962a" style="display: block; height: auto; border: 0;" title="E-Mail" width="32"/></a></td>
            </tr>
            </table>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-36" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="icons_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="vertical-align: middle; padding-bottom: 5px; padding-top: 5px; color: #9d9d9d; font-family: inherit; font-size: 15px; text-align: center;">
            <table cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="vertical-align: middle; text-align: center;">
            <!--[if vml]><table align="left" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0px;padding-right:0px;mso-table-lspace: 0pt;mso-table-rspace: 0pt;"><![endif]-->
            <!--[if !vml]><!-->
            <table cellpadding="0" cellspacing="0" class="icons-inner" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block; margin-right: -4px; padding-left: 0px; padding-right: 0px;">
            <!--<![endif]-->
            </table>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table><!-- End -->
            </body>
            </html>`,
          };


          sgMail.send(msg)
              .then(() => {
                console.log("Departue confirmation email sent");
              })
              .catch((error) => {
                console.error(error);
              });
        } else if (departureReservationNumber === "none" && returnReservationNumber !== "none") {
          console.log("sending return email");
          const msg = {
            to: `${userEmail}`,
            from: {
              email: "bookings@zerojet.com",
              name: "Zerojet",
            },
            subject: "Return flight confirmation",
            html: `<!DOCTYPE html><html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
            <head>
            <title></title>
            <meta content="text/html; charset=utf-8" http-equiv="Content-Type"/>
            <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
            <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
            <style>
                * {
                  box-sizing: border-box;
                }
            
                body {
                  margin: 0;
                  padding: 0;
                }
            
                a[x-apple-data-detectors] {
                  color: inherit !important;
                  text-decoration: inherit !important;
                }
            
                #MessageViewBody a {
                  color: inherit;
                  text-decoration: none;
                }
            
                p {
                  line-height: inherit
                }
            
                @media (max-width:570px) {
                  .icons-inner {
                    text-align: center;
                  }
            
                  .icons-inner td {
                    margin: 0 auto;
                  }
            
                  .row-content {
                    width: 100% !important;
                  }
            
                  .image_block img.big {
                    width: auto !important;
                  }
            
                  .column .border {
                    display: none;
                  }
            
                  .stack .column {
                    width: 100%;
                    display: block;
                  }
                }
              </style>
            </head>
            <body style="background-color: #f9f9f9; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
            <table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f9f9f9;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fimage-2-removebg-preview.png?alt=media&token=beee05a5-fc40-4d18-af62-d7fdf9d8b5b2" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fround_corners_2.png?alt=media&token=444af699-d9ff-46c5-bf7d-9c07d4171c36" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f5f5f5; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fhero_Image.png?alt=media&token=dd187c41-e4fd-4468-acbc-4ea8118003ed" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" width="550"/></div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:25px;padding-left:10px;padding-right:10px;padding-top:25px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #0b1560; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:22px;"><strong><span style="">Return Flight Confirmation<br/></span></strong></span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fround_corners_2.png?alt=media&token=444af699-d9ff-46c5-bf7d-9c07d4171c36" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-5" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #0b1560; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:10px;padding-top:55px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:18px;"><strong>${destination}</strong></span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:45px;padding-left:10px;padding-right:10px;padding-top:10px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; text-align: center;"><span style="font-size:14px;">${returnLeaveDate}<br/>${returnLeaveTime}<br/>${returnLeaveAirport}</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;padding-top:65px;padding-bottom:5px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2F49aaa3f3-ba60-4e58-94f3-9613e8f612f3.png?alt=media&token=70a402cf-9cb5-40d5-89d3-daa975751799" style="display: block; height: auto; border: 0; width: 46px; max-width: 100%;" title="Alternate text" width="46"/></div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-3" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:10px;padding-top:55px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:18px;"><strong>${origin}</strong></span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:45px;padding-left:10px;padding-right:10px;padding-top:10px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; text-align: center;"><span style="font-size:14px;">${returnArriveDate}<br/>${returnArriveTime}<br/>${returnArriveAirport}</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-6" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #0b1560; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="10" cellspacing="0" class="divider_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td>
            <div align="center">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="90%">
            <tr>
            <td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #FFFFFF;"><span> </span></td>
            </tr>
            </table>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-8" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #0b1560; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;"> </div>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-9" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%">
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-11" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <div class="spacer_block" style="height:20px;line-height:20px;font-size:1px;"> </div>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-12" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fround_corners_2.png?alt=media&token=444af699-d9ff-46c5-bf7d-9c07d4171c36" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-13" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:10px;padding-left:35px;padding-right:10px;padding-top:10px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #0b1560; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px;"><span style="font-size:17px;">Booking Details</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-14" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Carrier<br/><br/>Flight Number</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${returnAirlineName}<br/><br/>${returnFlightNumber}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-15" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Return date</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${returnLeaveDate}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-16" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Reservation number</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${returnReservationNumber}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-17" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">PNR</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 12px;">${returnFlightPNR}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-18" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Class</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Economy</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-19" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Luggage</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">1 x 10kg Carry-on bag</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:10px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">${checkedBagCount} x 23kg Checked bag</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-20" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Booking reference</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${returnReservationNumber}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-21" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fround_corners_2.png?alt=media&token=444af699-d9ff-46c5-bf7d-9c07d4171c36" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-22" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-bottom:10px;padding-left:35px;padding-right:10px;padding-top:10px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #0b1560; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px;"><span style="font-size:17px;">Passenger Information</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-23" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">First name</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">${firstName}</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-24" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Last name</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">${lastName}</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-25" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Date of birth</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${DOB}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-26" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Email</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${userEmail}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-27" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:10px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left; mso-line-height-alt: 21px;"><span style="font-size:14px;">Phone number</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            <td class="column column-2" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="50%">
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td style="padding-left:35px;padding-right:25px;padding-top:15px;padding-bottom:5px;">
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 18px; color: #232323; line-height: 1.5; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: left;">${userPhoneNumber}</p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-28" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fround_corners_2.png?alt=media&token=444af699-d9ff-46c5-bf7d-9c07d4171c36" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-29" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <div class="spacer_block" style="height:20px;line-height:20px;font-size:1px;"> </div>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-30" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="10" cellspacing="0" class="button_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td>
            <div align="center">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:42px;width:152px;v-text-anchor:middle;" arcsize="10%" stroke="false" fillcolor="#0068a5"><w:anchorlock/><v:textbox inset="0px,0px,0px,0px"><center style="color:#ffffff; font-family:Tahoma, sans-serif; font-size:16px"><![endif]-->
            <div style="text-decoration:none;display:inline-block;color:#ffffff;background-color:#0b1560;border-radius:4px;width:auto;border-top:1px solid #0b1560;border-right:1px solid #0b1560;border-bottom:1px solid #0b1560;border-left:1px solid #0b1560;padding-top:5px;padding-bottom:5px;font-family:Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;"><a href="${returnCheckInOnlineURL}"><span style="padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;"><span style="color:white; font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;">Check In Online</span></span></a></div>
            <!--[if mso]></center></v:textbox></v:roundrect><![endif]-->
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-31" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <div class="spacer_block" style="height:20px;line-height:20px;font-size:1px;"> </div>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-32" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="width:100%;padding-right:0px;padding-left:0px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" class="big" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fdown_round.png?alt=media&token=d21aa0d6-3e09-4611-90c6-ab307d695690" style="display: block; height: auto; border: 0; width: 550px; max-width: 100%;" title="Alternate text" width="550"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-33" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="padding-bottom:15px;width:100%;padding-right:0px;padding-left:0px;padding-top:35px;">
            <div align="center" style="line-height:10px"><img alt="Alternate text" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Flogo.png?alt=media&token=7c93e2ee-cab5-479a-bf33-50c626713151" style="display: block; height: auto; border: 0; width: 138px; max-width: 100%;" title="Alternate text" width="138"/></div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-34" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="10" cellspacing="0" class="divider_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td>
            <div align="center">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="95%">
            <tr>
            <td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px dashed #BBBBBB;"><span> </span></td>
            </tr>
            </table>
            </div>
            </td>
            </tr>
            </table>
            <table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
            <tr>
            <td>
            <div style="font-family: sans-serif">
            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #000000; line-height: 1.2; font-family: Montserrat, Trebuchet MS, Lucida Grande, Lucida Sans Unicode, Lucida Sans, Tahoma, sans-serif;">
            <p style="margin: 0; font-size: 14px; text-align: center;"><strong><span style="color:#232323;font-size:15px;"><a href="#" rel="noopener" style="text-decoration:none;color:#232323;" target="_blank">Need Help?</a></span></strong><br/><span style="color:#232323;">Use the links below to send us an email or chat with one of our customer service agents.</span></p>
            </div>
            </div>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-35" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="10" cellspacing="0" class="social_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="social-table" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="84px">
            <tr>
            <td style="padding:0 5px 0 5px;"><a href="https://wa.me/16479157325" target="_blank"><img alt="WhatsApp" height="32" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fwhatsapp2x.png?alt=media&token=18a4a61f-96c0-48d5-9601-fd7afc953808" style="display: block; height: auto; border: 0;" title="WhatsApp" width="32"/></a></td>
            <td style="padding:0 5px 0 5px;"><a href="mailto:support@zerojet.com" target="_blank"><img alt="E-Mail" height="32" src="https://firebasestorage.googleapis.com/v0/b/zerojet-85661.appspot.com/o/emailImages%2Fmail2x.png?alt=media&token=816b69b1-499a-4eee-94ac-7f9337a7962a" style="display: block; height: auto; border: 0;" title="E-Mail" width="32"/></a></td>
            </tr>
            </table>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-36" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tbody>
            <tr>
            <td>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 550px;" width="550">
            <tbody>
            <tr>
            <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
            <table border="0" cellpadding="0" cellspacing="0" class="icons_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="vertical-align: middle; padding-bottom: 5px; padding-top: 5px; color: #9d9d9d; font-family: inherit; font-size: 15px; text-align: center;">
            <table cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
            <tr>
            <td style="vertical-align: middle; text-align: center;">
            <!--[if vml]><table align="left" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0px;padding-right:0px;mso-table-lspace: 0pt;mso-table-rspace: 0pt;"><![endif]-->
            <!--[if !vml]><!-->
            <table cellpadding="0" cellspacing="0" class="icons-inner" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block; margin-right: -4px; padding-left: 0px; padding-right: 0px;">
            <!--<![endif]-->
            </table>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table><!-- End -->
            </body>
            </html>`,
          };


          sgMail.send(msg)
              .then(() => {
                console.log("Return confirmation email sent");
              })
              .catch((error) => {
                console.error(error);
              });
        }


        console.log("Account status is not 0");
      }

      console.log("Account status is 0");
    });

// exports.retrieveBalanceTransactionPayments = functions.https.onCall((data, context) => {
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
//   let resultingBalanceTransactionData;

//   return stripe.customers.listBalanceTransactions(
//       CUSTOMER_ID
//   ).then((results) => {
//     resultingBalanceTransactionData = JSON.parse(JSON.stringify(results));

//     balanceTransactionRecordsRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("stripeBalanceTransactions");

//     balanceTransactionRecordsRef.set({
//       "balanceTransactionRecord": resultingBalanceTransactionData,
//     });

//     console.log("Document successfully updated!", results);
//     return {text: "success"};
//   }).catch((err) => {
//     errorRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("RetrievalErrors")
//         .collection("stripeBalanceTransactions");

//     resultingData = JSON.parse(JSON.stringify(err));
//     console.log("customerCreationError", resultingData);
//     errorRef.add({
//       "error": resultingData,
//     });

//     console.log("Error code is: ", err.code);
//     return {text: "error"};
//   });
// });

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


// exports.captureTopUpPayment = functions.https.onCall((data, context) => {
//   const PAYMENT_METHOD_ID = data.pm;
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
//   let errorData;
//   let topUpPaymentRef;
//   let topUpPaymentRecordsRef;
//   let balanceTransactionRecordsRef;
//   let balanceTransactionRecordRefTwo;
//   let lastBalanceTransactionStatusRef;

//   return stripe.paymentIntents.create({
//     amount: amount, // $1 = 100, $10 = 1000
//     currency: currency,
//     customer: CUSTOMER_ID,
//     payment_method: PAYMENT_METHOD_ID,
//     error_on_requires_action: true,
//     confirm: true,
//   }).then((results) => {
//     resultingData = JSON.parse(JSON.stringify(results));

//     topUpPaymentRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("topUpPaymentRef");

//     topUpPaymentRef.set({
//       "status": "success",
//       "refDate": refDate,
//     });

//     topUpPaymentRecordsRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("successfulTopUpPayments")
//         .collection(`${refDate}`);

//     topUpPaymentRecordsRef.add({
//       "stripeObject": resultingData,
//     });

//     return stripe.customers.createBalanceTransaction(
//         CUSTOMER_ID,
//         {amount: -amount,
//           currency: currency,
//           description: `Top-up on ${refDate}`,
//         }).then((results) => {
//       resultingBalanceTransactionData = JSON.parse(JSON.stringify(results));

//       balanceTransactionRecordsRef = fs.collection("userData")
//           .doc(userID)
//           .collection("allUserDocuments")
//           .doc("balanceTransactions")
//           .collection(`${refDate}`);

//       balanceTransactionRecordsRef.add({
//         "balanceTransactionRecord": resultingBalanceTransactionData,
//         "stripePaymentObject": resultingData,
//       });

//       balanceTransactionRecordRefTwo = fs.collection("userData")
//           .doc(userID)
//           .collection("allUserDocuments")
//           .doc("lastBalanceTransaction");

//       balanceTransactionRecordRefTwo.set({
//         resultingBalanceTransactionData,
//       });

//       lastBalanceTransactionStatusRef = fs.collection("userData")
//           .doc(userID)
//           .collection("allUserDocuments")
//           .doc("balanceTransactionRef");

//       lastBalanceTransactionStatusRef.set({
//         "status": "success",
//         "refDate": refDate,
//       });

//       console.log("Document successfully updated!", results);
//       return {text: "success"};
//     }).catch((err) => {
//       errorData = JSON.parse(JSON.stringify(err));

//       lastBalanceTransactionStatusRef = fs.collection("userData")
//           .doc(userID)
//           .collection("allUserDocuments")
//           .doc("balanceTransactionRef");

//       lastBalanceTransactionStatusRef.set({
//         "status": "failure",
//         "refDate": refDate,
//       });

//       docRef = fs.collection("userData")
//           .doc(userID)
//           .collection("allUserDocuments")
//           .doc("balanceTransactions")
//           .collection("creationErrors");


//       console.log("customerCreationError", resultingData);
//       docRef.add({
//         "error": errorData,
//       });
//       console.log("Error code is: ", err.code);
//       return {text: "Invalid Auth Code 2"};
//     });
//   }).catch((err) => {
//     topUpPaymentRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("topUpPaymentRef");

//     topUpPaymentRef.set({
//       "status": "failure",
//       "refDate": refDate,
//     });

//     docRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("balanceTransactions")
//         .collection("topUpPaymentErrors");

//     resultingData = JSON.parse(JSON.stringify(err));
//     console.log("customerCreationError", resultingData);
//     docRef.add({
//       "error": resultingData,
//     });
//     console.log("Error code is: ", err.code);
//     return {text: "Invalid Auth Code 2"};
//   });
// });


// exports.createCustomerCard = functions.https.onCall((data, context) => {
//   const PAYMENT_METHOD_ID = data.PaymentMethodID;
//   const authcode = data.authCode;
//   const res = authcode.split("}{");

//   const CUSTOMER_ID = res[0];
//   const userID = res[1];


//   console.log("ReadTest1", CUSTOMER_ID);
//   console.log("ReadTest2", userID);
//   console.log("ReadTest3", PAYMENT_METHOD_ID);


//   let resultingData;
//   let docRef;
//   let quickRef;

//   return stripe.paymentMethods.attach(
//       PAYMENT_METHOD_ID,
//       {
//         customer: CUSTOMER_ID,
//       }).then((response) => {
//     docRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("Payments");


//     resultingData = JSON.parse(JSON.stringify(response));
//     console.log("customerCreationSuccess", resultingData);


//     return docRef.update({
//       resultingData,
//     }).then((results) => {
//       quickRef = fs.collection("userData")
//           .doc(userID)
//           .collection("allUserDocuments")
//           .doc("PaymentsQuickRef");

//       quickRef.set({
//         "status": "success",
//       });

//       console.log("Document successfully updated!", results);
//       return {text: "success"};
//     }).catch((error) => {
//       // The document probably doesn't exist.
//       console.error("Error updating document: ", error);
//       return {text: "Invalid Auth Code 1"};
//     });
//   }).catch((err) => {
//     docRef = fs.collection("userData")
//         .doc(userID)
//         .collection("allUserDocuments")
//         .doc("Payments")
//         .collection("Errors");


//     resultingData = JSON.parse(JSON.stringify(err));
//     console.log("customerCreationError", resultingData);
//     docRef.add({
//       "error": resultingData,
//     });

//     return {text: "Invalid Auth Code 2"};
//   });
// });
