const Sentry = require('@sentry/node');
const dialogFlow = require('apiai-promise');
const moment = require('moment');
const accents = require('remove-accents');

// Sentry - error reporting
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.ENV, captureUnhandledRejections: false });
moment.locale('pt-BR');

async function formatDialogFlow(text) {
	let result = text.toLowerCase();
	result = await result.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2580-\u27BF]|\uD83E[\uDD10-\uDDFF])/g, '');
	result = await accents.remove(result);
	if (result.length >= 250) {
		result = result.slice(0, 250);
	}
	return result.trim();
}

async function waitTypingEffect(context, waitTime = 2500) {
	await context.typingOn();
	setTimeout(async () => {
		await context.typingOff();
	}, waitTime);
}

// week day dictionary
const weekDayName = {
	0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 7: 'Domingo',
};

const cidadeDictionary = {
	1: 'São Paulo - SP', 2: 'Belo Horizonte - MG', 3: 'Salvador - BA',
};

const telefoneDictionary = {
	1: '11111-1111', 2: '2222-2222', 3: '33333-3333',
};


async function addNewUser(context, prepAPI) {
	const answer = await prepAPI.getRecipientPrep(context.session.user.id);
	if (answer.form_error) {
		await prepAPI.postRecipientPrep(context.session.user.id, context.state.politicianData.user_id, `${context.session.user.first_name} ${context.session.user.last_name}`);
	}
}

function formatHour(hour) {
	if (hour.toString().length === 1) {
		return `0${hour}`;
	}
	return hour;
}

function formatDate(date) {
	const data = new Date(date);
	return `${weekDayName[data.getDay()]}, ${formatHour(data.getDate())} de ${moment(date).utcOffset('+0000').format('MMMM')} às ${formatHour(data.getHours())}:${formatHour(data.getMinutes())}`;
	// return `${moment(date).format('dddd')}, ${moment(date).format('D')} de ${moment(date).format('MMMM')} às ${moment(date).format('hh:mm')}`;
	// return `${moment(date).format('dddd')}, ${moment(date).format('D')} de ${moment(date).format('MMMM')} às ${moment(date).utcOffset('+0000').format('hh:mm')}`;
}

function formatInitialDate(date) {
	date.setMinutes(0);
	date.setSeconds(0);
	// date.setMilliseconds(0); // already ignored because of moment.js' date to timestamp conversion
	date.setHours(date.getHours() + 1);
	return date;
}

function capQR(text) {
	let result = text;
	if (result.length > 20) {
		result = `${result.slice(0, 17)}...`;
	}
	return result;
}


module.exports.Sentry = Sentry;
module.exports.addNewUser = addNewUser;
module.exports.apiai = dialogFlow(process.env.DIALOGFLOW_TOKEN);
module.exports.moment = moment;
module.exports.capQR = capQR;
module.exports.formatDialogFlow = formatDialogFlow;
module.exports.waitTypingEffect = waitTypingEffect;
module.exports.formatDate = formatDate;
module.exports.formatInitialDate = formatInitialDate;
module.exports.weekDayName = weekDayName;
module.exports.cidadeDictionary = cidadeDictionary;
module.exports.telefoneDictionary = telefoneDictionary;
