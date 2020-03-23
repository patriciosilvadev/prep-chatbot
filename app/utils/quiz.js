const prepApi = require('./prep_api');
const aux = require('./quiz_aux');
const flow = require('./flow');
const { addCityLabel } = require('./labels');
const help = require('./helper');
const { sentryError } = require('./error');

// loads next question and shows it to the user
async function answerQuiz(context) {
	if (!context.state.startedQuiz) await context.setState({ startedQuiz: true }); // if we passed here we started a new quiz
	if (!context.state.categoryQuestion || context.state.categoryQuestion === '') { // if the user never started the quiz the category is 'publico_interesse'
		await context.setState({ categoryQuestion: 'publico_interesse' });
	}

	await context.setState({ currentQuestion: await prepApi.getPendinQuestion(context.session.user.id, context.state.categoryQuestion) });
	await aux.sendQuizQuestion(context, 'quiz');
}

async function handleQuizResposta(context, quizOpt) {
	// error sending message to API, send user to same question and send error to the devs
	if (!context.state.sentAnswer || context.state.sentAnswer.error) {
		await context.sendText(flow.quiz.form_error);
		await context.setState({ dialog: 'startQuiz' });
		if (process.env.ENV !== 'local') await sentryError('PREP - Erro ao salvar resposta do Quiz', { sentAnswer: context.state.sentAnswer, quizOpt, state: context.state });
		return false;
	}
	// Invalid input format, make user try again on same question. // Date is: YYYY-MM-DD
	if (context.state.sentAnswer.form_error || (context.state.sentAnswer.form_error && context.state.sentAnswer.form_error.answer_value && context.state.sentAnswer.form_error.answer_value === 'invalid')) { // input format is wrong (text)
		await context.sendText(flow.quiz.invalid);
		await context.setState({ dialog: 'startQuiz' }); // re-asks same question
		return false;
	}

	// saving city labels
	if (context.state.currentQuestion.code === 'A1') await addCityLabel(context.session.user.id, quizOpt);

	// add registration form link to send later
	if (context.state.sentAnswer.offline_pre_registration_form) await context.setState({ registrationForm: context.state.sentAnswer.offline_pre_registration_form });


	await aux.sendFollowUpMsgs(context);
	if (context.state.sentAnswer.finished_quiz) await context.setState({ startedQuiz: false });	// clean started quiz when each quiz is finished

	// from here on out, the flow of the quiz actually changes, so remember to return something to stop the rest from executing
	if (context.state.categoryQuestion === 'publico_interesse' && context.state.sentAnswer.finished_quiz === 1 && context.state.sentAnswer.is_target_audience === 0) {
		await context.setState({ dialog: 'offerBrincadeira', publicoInteresseEnd: true, categoryQuestion: '' });
		return false;
	}

	if (context.state.categoryQuestion === 'publico_interesse' && context.state.sentAnswer.finished_quiz && context.state.sentAnswer.is_target_audience) {
		await context.setState({ dialog: 'ofertaPesquisaStart', publicoInteresseEnd: true, categoryQuestion: '' });
		await context.setState({ whenBecameTargetAudience: new Date() });
		return false;
	}

	if (context.state.categoryQuestion === 'quiz_brincadeira' && context.state.sentAnswer.finished_quiz === 1) {
		await context.setState({ dialog: 'preTCLE', quizBrincadeiraEnd: true, categoryQuestion: '' });
		return false;
	}

	if (context.state.categoryQuestion === 'recrutamento' && context.state.sentAnswer.finished_quiz === 1) {
		await context.setState({ dialog: 'preTCLE', recrutamentoEnd: true, categoryQuestion: '' });
		return false;
	}

	if (context.state.sentAnswer && context.state.sentAnswer.finished_quiz === 0) { // check if the quiz is over
		await context.setState({ dialog: 'startQuiz' });
		return false;
	}

	return true;
}

async function handleAnswer(context, quizOpt) {
	// context.state.currentQuestion.code -> the code for the current question
	// quizOpt -> the quiz option the user clicked/wrote
	await context.setState({ onTextQuiz: false, onButtonQuiz: false });
	await context.setState({ sentAnswer: await prepApi.postQuizAnswer(context.session.user.id, context.state.categoryQuestion, context.state.currentQuestion.code, quizOpt) });
	console.log(`\nResultado do post da pergunta ${context.state.currentQuestion.code} - ${quizOpt}:`, context.state.sentAnswer, '\n');
	if (process.env.ENV === 'local') { await context.sendText(JSON.stringify(context.state.sentAnswer, null, 2)); }

	quizOpt = quizOpt.toString() || '';
	await handleQuizResposta(context, quizOpt);
}


// extra questions -> explanation of obscure terms
// sends the answer to the question and sends user back to the question
async function AnswerExtraQuestion(context) {
	const index = context.state.lastQRpayload.replace('extraQuestion', '');
	const answer = context.state.currentQuestion.extra_quick_replies[index].text;
	await context.sendText(answer);
	await context.setState({ dialog: 'startQuiz' }); // re-asks same question
	return answer;
}

// allows user to type the text on a button to choose that option
async function handleText(context) {
	if (!context.state.whatWasTyped) return null;
	let text = context.state.whatWasTyped.toLowerCase();
	text = await help.accents.remove(text);
	let getIndex = null;
	context.state.buttonTexts.forEach((e, i) => {
		if (e.trim() === text.trim() && getIndex === null) { // user text has to be the same as the button text
		// if (e.includes(text) && getIndex === null) { // user text has to be belong to the button
			getIndex = i + 1;
		}
	});

	if (getIndex === null) return null;
	return getIndex;
}

module.exports = {
	answerQuiz,
	handleAnswer,
	AnswerExtraQuestion,
	handleText,
	checkFinishQuiz: aux.checkFinishQuiz,
	handleQuizResposta,
};
