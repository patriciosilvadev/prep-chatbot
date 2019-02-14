const prepApi = require('./prep_api.js');
const aux = require('./quiz_aux');


// loads next question and shows it to the user
async function answerQuizA(context) {
	await context.typingOn();
	await context.setState({ currentQuestion: await prepApi.getPendinQuestion(context.session.user.id, context.state.categoryQuestion) });
	console.log('\nA nova pergunta do get', context.state.currentQuestion, '\n');

	await aux.handleFlags(context, context.state.currentQuestion);

	if (!context.state.currentQuestion || context.state.currentQuestion.code === null) { // user already answered the quiz (user shouldn't be here)
		await aux.endQuizA(context, prepApi); // quiz is over
	} else { /* eslint-disable no-lonely-if */ // user is still answering the quiz
		if (context.state.categoryQuestion === 'quiz') { // send encouragement only on the regular quiz
			if (context.state.currentQuestion.count_more === 10) { // encouragement message
				await context.sendText('Bafo! Estou adorando te conhecer...');
			} else if (context.state.currentQuestion.count_more === 5) {
				await context.sendText('Amando! Só mais algumas vai...');
			} else if (context.state.currentQuestion.count_more === 2) {
				await context.sendText('Arrasando.. só mais 2 e juro que paro de ser curiosa 🤩');
			}
		}

		await aux.handleAC5(context);

		// showing question and answer options
		if (context.state.currentQuestion.type === 'multiple_choice') {
			await context.sendText(context.state.currentQuestion.text, await aux.buildMultipleChoice(context.state.currentQuestion));
		} else if (context.state.currentQuestion.type === 'open_text') {
			await context.setState({ onTextQuiz: true });
			await context.sendText(context.state.currentQuestion.text);
		}
		await context.typingOff();
		/* eslint-enable no-lonely-if */
	} // -- answering quiz else
}

// extra questions -> explanation of obscure terms
// sends the answer to the question and sends user back to the question
async function AnswerExtraQuestion(context) {
	const index = context.state.lastQRpayload.replace('extraQuestion', '');
	const answer = context.state.currentQuestion.extra_quick_replies[index].text;
	await context.sendText(answer);
	await context.setState({ dialog: 'startQuizA' }); // re-asks same question
}

async function handleAnswerA(context, quizOpt) {
	// context.state.currentQuestion.code -> the code for the current question
	// quizOpt -> the quiz option the user clicked/wrote
	await context.setState({ sentAnswer: await prepApi.postQuizAnswer(context.session.user.id, context.state.categoryQuestion, context.state.currentQuestion.code, quizOpt) });
	console.log('\nResultado do post da pergunta', context.state.sentAnswer, '\n');
	await context.setState({ onTextQuiz: false });

	if (context.state.sentAnswer.error || context.state.sentAnswer.form_erro) { // error
		await context.sendText('Ops, Parece que me perdi, Pode me responder de novo?');
		await context.setState({ dialog: 'startQuizA' }); // not over, sends user to next question
	} else if (context.state.sentAnswer.form_error && context.state.sentAnswer.form_error.answer_value && context.state.sentAnswer.form_error.answer_value === 'invalid') { // input format is wrong (text)
		await context.sendText('Formato inválido! Tente novamente!');
		// Date is: YYYY-MM-DD
		await context.setState({ dialog: 'startQuizA' }); // re-asks same question
	} else { /* eslint-disable no-lonely-if */ // no error, answer was saved successfully
		await aux.handleFlags(context, context.state.sentAnswer);

		if (context.state.sentAnswer && context.state.sentAnswer.finished_quiz === 0) { // check if the quiz is over
			await context.setState({ dialog: 'startQuizA' }); // not over, sends user to next question
		} else {
			await aux.endQuizA(context, prepApi); // quiz is over
		}
		/* eslint-enable no-lonely-if */
	}
}

module.exports.answerQuizA = answerQuizA;
module.exports.handleAnswerA = handleAnswerA;
module.exports.AnswerExtraQuestion = AnswerExtraQuestion;
