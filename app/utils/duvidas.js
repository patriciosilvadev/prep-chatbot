const flow = require('./flow');
const { getQR } = require('./attach');
const { sendMain } = require('./mainMenu');
const prepApi = require('./prep_api');
const quizAux = require('./quiz_aux');
const help = require('./helper');

async function prepFollowUp(context) {
	if (context.state.user.voucher_type === 'sus') {
		let text = flow.duvidasPrep.textosSUS[context.state.user.city];
		if (!text) text = flow.duvidasPrep.demaisLocalidades;
		if (text) await context.sendText(flow.duvidasPrep.prefixSUS + text);
		await sendMain(context);
	} else {
		await context.setState({ nextDialog: '' });
		await context.sendText(flow.duvidasPrep.notSUS, await getQR(flow.ofertaPesquisaSim));
	}
}

async function deuRuimPrepFollowUp(context, extraMsg) {
	if (extraMsg && typeof extraMsg === 'string') await context.sendText(extraMsg);
	if (context.state.user.voucher_type === 'sus') {
		await context.sendText(flow.deuRuimPrep.followUpSUS);
		await sendMain(context);
	} else {
		await context.setState({ nextDialog: '' });
		await context.sendText(flow.deuRuimPrep.notSUS, await getQR(flow.ofertaPesquisaSim));
	}
}

async function alarmeOK(context) {
	if (context.state.user.voucher_type === 'combina') {
		await context.sendText(flow.alarmePrep.comoTomando.text1, await getQR(flow.alarmePrep.comoTomando));
	} else if (context.state.user.voucher_type === 'sisprep') {
		await context.sendText(flow.alarmePrep.comoAjudo.text1, await getQR(flow.alarmePrep.comoAjudo));
	}
}

async function alarmeHorario(page = 1, btnParam, textType = 1) {
	if (page < 0) { page = 2; }
	if (page > 2) { page = 0; }


	const opts = [];
	let pivot = page * 8;
	opts.push({ content_type: 'text', title: 'Mais Cedo', payload: `page${btnParam}${page - 1}` });

	for (let i = 1; i <= 8; i++) {
		let title = null;
		if (textType === 1) title = pivot === 1 ? `A ${pivot}` : `As ${pivot}`;
		if (textType === 2 && pivot > 0) title = pivot === 1 ? `${pivot} hora antes` : `${pivot} horas antes`;

		if (title) opts.push({ content_type: 'text', title, payload: `${btnParam}${pivot}` });
		pivot += 1;
	}
	opts.push({ content_type: 'text', title: 'Mais Tarde', payload: `page${btnParam}${page + 1}` });

	return { quick_replies: opts };
}

async function alarmeMinuto(hora) {
	const opts = [];
	let minutos = '00';

	while (minutos < 60) {
		opts.push({ content_type: 'text', title: `As ${hora}:${minutos}`, payload: `alarmeFinal${minutos}` });
		minutos = parseInt(minutos, 10) + 10;
	}

	return { quick_replies: opts };
}

async function receivePage(context) {
	const payload = context.state.lastQRpayload.replace('page', '');
	const nextDialog = context.state.pageKey;
	const newPage = payload.replace(nextDialog, '');

	await context.setState({ alarmePage: newPage, dialog: nextDialog });
}

async function buildChoiceTimeStamp(hour, minutes) {
	const ts = new Date();
	ts.setHours(hour || 0);
	ts.setMinutes(minutes || 0);
	ts.setSeconds(0);
	ts.setMilliseconds(0);

	return ts;
}

async function formatDate(text) {
	const dateRegex = new RegExp(/^(((0[1-9]|[12]\d|3[01])\/(0[13578]|1[02])\/((19|[2-9]\d)\d{2}))|((0[1-9]|[12]\d|30)\/(0[13456789]|1[012])\/((19|[2-9]\d)\d{2}))|((0[1-9]|1\d|2[0-8])\/02\/((19|[2-9]\d)\d{2}))|(29\/02\/((1[6-9]|[2-9]\d)(0[48]|[2468][048]|[13579][26])|(([1][26]|[2468][048]|[3579][26])00))))$/g); // eslint-disable-line
	const isValid = dateRegex.test(text);
	if (!isValid) return false;

	const dateObject = help.moment(text, 'DD/MM/YYYY');
	const data = dateObject.toDate();
	if (data instanceof Date && !isNaN(data)) return data; // eslint-disable-line no-restricted-globals
	return false;
}

async function checkDate(date) {
	const today = help.moment(new Date());
	const data = help.moment(date);

	const dataAfterToday = data.isAfter(today);
	if (dataAfterToday === true) return 'A data da consulta passada não pode ser depois de hoje.';

	const diff = data.diff(today, 'months');
	if (diff < -6) return 'A data da sua consulta passada não pode ser de mais de 6 meses atrás.';

	return date;
}

async function alarmeDate(context) {
	let date = await formatDate(context.state.whatWasTyped);
	if (date) date = await checkDate(date);
	if (!date || typeof date === 'string') {
		await context.sendText(`${flow.alarmePrep.alarmeAcabar.invalid} ${date || ''}`);
		await context.setState({ dialog: 'alarmeAcabar' });
	} else {
		await context.setState({ dialog: 'alarmeAcabarFrascos', dataUltimaConsulta: date });
	}
}

async function deuRuimQuiz(context) {
	await context.setState({ categoryQuestion: 'deu_ruim_nao_tomei' });
	await context.setState({ currentQuestion: await prepApi.getPendinQuestion(context.session.user.id, context.state.categoryQuestion) });

	const quizText = process.env.ENV === 'prod' ? context.state.currentQuestion.text : `${context.state.currentQuestion.code}. ${context.state.currentQuestion.text}`;
	if (context.state.currentQuestion.type === 'multiple_choice') {
		await context.setState({ onButtonQuiz: true });
		await context.setState({ buttonsFull: await quizAux.buildMultipleChoice(context.state.currentQuestion, 'deuRuim') });
		await context.setState({ buttonTexts: await help.getButtonTextList(context.state.buttonsFull) });
		await context.sendText(quizText, context.state.buttonsFull);
	} else if (context.state.currentQuestion.type === 'open_text') {
		await context.setState({ onTextQuiz: true });
		await context.sendText(quizText);
	}
}

module.exports = {
	prepFollowUp,
	deuRuimPrepFollowUp,
	deuRuimQuiz,
	alarmeOK,
	alarmeHorario,
	alarmeMinuto,
	buildChoiceTimeStamp,
	receivePage,
	formatDate,
	checkDate,
	alarmeDate,
};
