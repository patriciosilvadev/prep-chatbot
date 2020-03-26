const cont = require('./context');
const flow = require('../app/utils/flow');
const opt = require('../app/utils/options');
const handler = require('../app/handler');
const MaAPI = require('../app/chatbot_api');
const quiz = require('../app/utils/quiz');
const prepAPI = require('../app/utils/prep_api');
const consulta = require('../app/utils/consulta');
const timer = require('../app/utils/timer');
const duvidas = require('../app/utils/duvidas');
const checkQR = require('../app/utils/checkQR');
const mainMenu = require('../app/utils/mainMenu');
const { getQR } = require('../app/utils/attach');

jest.mock('../app/utils/helper');
jest.mock('../app/chatbot_api');
jest.mock('../app/utils/flow');
jest.mock('../app/utils/options');
jest.mock('../app/utils/consulta');
jest.mock('../app/utils/quiz');
jest.mock('../app/utils/research');
jest.mock('../app/utils/timer');
jest.mock('../app/utils/duvidas');
jest.mock('../app/utils/mainMenu');
jest.mock('../app/utils/attach');
jest.mock('../app/utils/checkQR');
jest.mock('../app/utils/prep_api'); // mock prep_api tp avoid making the postRecipientPrep request

it('quiz - begin', async () => {
	const context = cont.quickReplyContext('beginQuiz', 'greetings');
	// usual quickReply checking here
	context.state.dialog = context.state.lastQRpayload;
	await handler(context);

	await expect(context.setState).toBeCalledWith({ startedQuiz: true });
	await expect(context.sendText).toBeCalledWith(flow.quiz.beginQuiz);
	await expect(quiz.answerQuiz).toBeCalledWith(context, 'publico_interesse');
});

it('quiz - multiple choice answer', async () => {
	const context = cont.quickReplyContext('quiz3', 'beginQuizA');
	await handler(context);

	await expect(context.event.isQuickReply).toBeTruthy();
	await expect(context.state.lastQRpayload !== context.event.quickReply.payload).toBeTruthy();
	await expect(context.setState).toBeCalledWith({ lastQRpayload: context.event.quickReply.payload });
	await expect(MaAPI.logFlowChange).toBeCalledWith(context.session.user.id, context.state.politicianData.user_id,
		context.event.message.quick_reply.payload, context.event.message.quick_reply.payload);
	await expect(context.state.lastQRpayload.slice(0, 4) === 'quiz').toBeTruthy();

	await expect(quiz.handleAnswer).toBeCalledWith(context, context.state.lastQRpayload.replace('quiz', ''));
});

it('quiz - multiple choice extra answer', async () => {
	const context = cont.quickReplyContext('extraQuestion3', 'beginQuizA');
	await handler(context);

	await expect(context.event.isQuickReply).toBeTruthy();	// usual quickReply checking
	await expect(context.setState).toBeCalledWith({ lastQRpayload: context.event.quickReply.payload });
	await expect(context.state.lastQRpayload.slice(0, 4) === 'quiz').toBeFalsy();
	await expect(context.state.lastQRpayload.slice(0, 13) === 'extraQuestion').toBeTruthy();
	await expect(quiz.AnswerExtraQuestion).toBeCalledWith(context);
});

it('joinResearchAfter', async () => {
	const context = cont.quickReplyContext('joinResearchAfter', 'joinResearchAfter');
	context.state.user = { is_eligible_for_research: 0 };
	await handler(context);

	await expect(prepAPI.putUpdatePartOfResearch).toBeCalledWith(context.session.user.id, 1);
	await expect(context.setState).toBeCalledWith({ categoryConsulta: 'recrutamento', sendExtraMessages: true });
	await expect(consulta.checarConsulta).toBeCalledWith(context);
});

describe('recrutamentoTimer', async () => {
	it('addRecrutamentoTimer - first time - creates', async () => {
		const context = cont.quickReplyContext('addRecrutamentoTimer', 'addRecrutamentoTimer');
		context.state.preCadastroSignature = false;
		context.state.recrutamentoTimer = false;
		await handler(context);

		await expect(!context.state.preCadastroSignature).toBeTruthy();
		await expect(context.setState).toBeCalledWith({ recrutamentoTimer: true });
		await expect(MaAPI.postRecipientMA).toBeCalledWith(context.state.politicianData.user_id,
			{ fb_id: context.session.user.id, session: { recrutamentoTimer: context.state.recrutamentoTimer } });
		await expect(timer.createRecrutamentoTimer).toBeCalledWith(context.session.user.id, context);

		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});

	it('addRecrutamentoTimer - was sent already (preCadastroSignature is true) - dont create', async () => {
		const context = cont.quickReplyContext('addRecrutamentoTimer', 'addRecrutamentoTimer');
		context.state.preCadastroSignature = true;
		context.state.recrutamentoTimer = false;
		await handler(context);

		await expect(!context.state.preCadastroSignature).toBeFalsy();
		await expect(context.setState).not.toBeCalledWith({ recrutamentoTimer: true });
		await expect(timer.createRecrutamentoTimer).not.toBeCalledWith(context.session.user.id, context);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});

	it('recrutamentoTimer - delete timer and create new on mainMenu', async () => {
		const context = cont.quickReplyContext('mainMenu', 'mainMenu');
		context.state.preCadastroSignature = false;
		context.state.recrutamentoTimer = true;
		context.state.recipientAPI = { session: { recrutamentoTimer: true } };
		await handler(context);

		await expect(timer.deleteTimers).toBeCalledWith(context.session.user.id);
		await expect(timer.createRecrutamentoTimer).toBeCalledWith(context.session.user.id, context);
	});

	it('recrutamentoTimer - delete timer and dont create new', async () => {
		const context = cont.quickReplyContext('phoneInvalid', 'phoneInvalid');
		context.state.preCadastroSignature = false;
		context.state.recrutamentoTimer = true;
		context.state.recipientAPI = { session: { recrutamentoTimer: false } };
		await handler(context);

		await expect(timer.deleteTimers).toBeCalledWith(context.session.user.id);
		await expect(timer.createRecrutamentoTimer).not.toBeCalledWith(context.session.user.id, context);
	});
});


describe('join - já tomo prep', async () => {
	it('intro - texto e botões', async () => {
		const context = cont.quickReplyContext('join', 'join');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.join.intro.text1, await getQR(flow.join.intro));
	});

	it('joinPrep - explicação e espera token', async () => {
		const context = cont.quickReplyContext('joinPrep', 'joinPrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.join.joinPrep.text1);
		await expect(context.sendText).toBeCalledWith(flow.join.askPrep.text1, await getQR(flow.join.askPrep));
	});

	it('joinCombina - explicação e confirmação', async () => {
		const context = cont.quickReplyContext('joinCombina', 'joinCombina');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.join.joinCombina.text1);
		await expect(context.sendText).toBeCalledWith(flow.join.joinCombina.text2, await getQR(flow.join.joinCombina));
	});

	it('joinCombinaSim - aceitou, atualiza voucher', async () => {
		const context = cont.quickReplyContext('joinCombinaSim', 'joinCombinaSim');
		await handler(context);

		await expect(prepAPI.putUpdateVoucherFlag).toBeCalledWith(context.session.user.id, 'combina');
		await expect(context.sendText).toBeCalledWith(flow.join.end);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});

	it('joinSUS - explicação e confirmação', async () => {
		const context = cont.quickReplyContext('joinSUS', 'joinSUS');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.join.joinSUS.text1);
		await expect(context.sendText).toBeCalledWith(flow.join.joinSUS.text2, await getQR(flow.join.joinSUS));
	});

	it('joinSUSSim - aceitou, atualiza voucher', async () => {
		const context = cont.quickReplyContext('joinSUSSim', 'joinSUSSim');
		await handler(context);

		await expect(prepAPI.putUpdateVoucherFlag).toBeCalledWith(context.session.user.id, 'sus');
		await expect(context.sendText).toBeCalledWith(flow.join.end);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});

	it('joinNaoSabe - explicações e volta pro join', async () => {
		const context = cont.quickReplyContext('joinNaoSabe', 'joinNaoSabe');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.join.joinNaoSabe.text1);
		await expect(context.sendText).toBeCalledWith(flow.join.joinNaoSabe.prep);
		await expect(context.sendText).toBeCalledWith(flow.join.joinNaoSabe.combina);
		await expect(context.sendText).toBeCalledWith(flow.join.joinNaoSabe.sus);
		await expect(context.sendText).toBeCalledWith(flow.join.intro.text1, await getQR(flow.join.intro));
	});

	it('joinNaoToma - vai pro greetings e manda o desafio', async () => {
		const context = cont.quickReplyContext('joinNaoToma', 'greetings');
		await handler(context);

		await expect(context.setState).toBeCalledWith({ dialog: 'greetings', askDesafio: false });
		await expect(context.sendText).toBeCalledWith(flow.greetings.text1);
		await expect(context.sendText).toBeCalledWith(flow.greetings.text2);
		await expect(context.sendText).toBeCalledWith(flow.greetings.text3);

		await expect(context.setState).toBeCalledWith({ askDesafio: true });
		await expect(context.sendText).toBeCalledWith(flow.asksDesafio.intro, opt.asksDesafio);
	});
});


describe('duvidasPrep - Dúvidas de usuário prep', async () => {
	it('intro - texto e botões', async () => {
		const context = cont.quickReplyContext('duvidasPrep', 'duvidasPrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.text1, await getQR(flow.duvidasPrep));
	});

	it('dpEfeitos - mosta menu de efeitos', async () => {
		const context = cont.quickReplyContext('dpEfeitos', 'dpEfeitos');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpEfeitos.text1, await getQR(flow.deuRuimPrep.drpEfeitos));
	});

	it('dpDrogas - explicação e followUp', async () => {
		const context = cont.quickReplyContext('dpDrogas', 'dpDrogas');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.dpDrogas);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	it('dpHormonios - explicação e followUp', async () => {
		const context = cont.quickReplyContext('dpHormonios', 'dpHormonios');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.dpHormonios);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	it('dpEsqueci - explicação e followUp', async () => {
		const context = cont.quickReplyContext('dpEsqueci', 'dpEsqueci');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.dpEsqueci);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	it('dpInfo - explicação, link e followUp', async () => {
		const context = cont.quickReplyContext('dpInfo', 'dpInfo');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.dpInfo);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});
});

describe('duvidasNaoPrep', async () => {
	it('intro', async () => {
		const context = cont.quickReplyContext('duvidasNaoPrep', 'duvidasNaoPrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasNaoPrep.text1, await getQR(flow.duvidasNaoPrep));
	});

	it('dnpDrogas - explicação e volta para intro', async () => {
		const context = cont.quickReplyContext('dnpDrogas', 'dnpDrogas');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasNaoPrep.dnpDrogas);
		await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.duvidasNaoPrep.end);
	});

	it('dnpHormonios - explicação e volta para intro', async () => {
		const context = cont.quickReplyContext('dnpHormonios', 'dnpHormonios');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasNaoPrep.dnpHormonios);
		await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.duvidasNaoPrep.end);
	});

	it('dnpParaMim - explicação e fluxo recrutamento (pendente)', async () => {
		const context = cont.quickReplyContext('dnpParaMim', 'dnpParaMim');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasNaoPrep.dnpParaMim1);
		await expect(context.sendText).toBeCalledWith(flow.duvidasNaoPrep.dnpParaMim2);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});

	it('dnpMeTestar - explicação e autoteste', async () => {
		const context = cont.quickReplyContext('dnpMeTestar', 'dnpMeTestar');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasNaoPrep.dnpMeTestar);
	});
});


describe('deuRuimPrep', async () => {
	it('intro', async () => {
		const context = cont.quickReplyContext('deuRuimPrep', 'deuRuimPrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.text1, await checkQR.checkDeuRuimPrep(context, await getQR(flow.deuRuimPrep)));
	});

	it('drpFamilia - explicação e prepDuvidaFollowUp', async () => {
		const context = cont.quickReplyContext('drpFamilia', 'drpFamilia');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpFamilia);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	it('drpParceiros - explicação e prepDuvidaFollowUp', async () => {
		const context = cont.quickReplyContext('drpParceiros', 'drpParceiros');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpParceiros);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	it('drpAmigos - explicação e prepDuvidaFollowUp', async () => {
		const context = cont.quickReplyContext('drpAmigos', 'drpAmigos');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpAmigos);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	describe('drpEfeitos', async () => {
		it('intro', async () => {
			const context = cont.quickReplyContext('drpEfeitos', 'drpEfeitos');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpEfeitos.text1, await getQR(flow.deuRuimPrep.drpEfeitos));
		});

		it('drpEnjoo - explicação e followUp com msg extra', async () => {
			const context = cont.quickReplyContext('drpEnjoo', 'drpEnjoo');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpEfeitos.drpEnjoo);
			await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context, flow.deuRuimPrep.drpEfeitos.followUp);
		});

		it('drpGases - explicação e followUp com msg extra', async () => {
			const context = cont.quickReplyContext('drpGases', 'drpGases');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpEfeitos.drpGases);
			await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context, flow.deuRuimPrep.drpEfeitos.followUp);
		});

		it('drpDiarreia - explicação e followUp com msg extra', async () => {
			const context = cont.quickReplyContext('drpDiarreia', 'drpDiarreia');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpEfeitos.drpDiarreia);
			await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context, flow.deuRuimPrep.drpEfeitos.followUp);
		});

		it('drpDorCabeca - explicação e followUp com msg extra', async () => {
			const context = cont.quickReplyContext('drpDorCabeca', 'drpDorCabeca');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpEfeitos.drpDorCabeca);
			await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context, flow.deuRuimPrep.drpEfeitos.followUp);
		});

		it('drpMoleza - explicação e followUp com msg extra', async () => {
			const context = cont.quickReplyContext('drpMoleza', 'drpMoleza');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpEfeitos.drpMoleza);
			await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context, flow.deuRuimPrep.drpEfeitos.followUp);
		});
	});

	describe('drpIST', async () => {
		it('intro', async () => {
			const context = cont.quickReplyContext('drpIST', 'drpIST');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.text1, await getQR(flow.deuRuimPrep.drpIST));
		});

		it('drpBolhas - explicação e followUp', async () => {
			const context = cont.quickReplyContext('drpBolhas', 'drpBolhas');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpBolhas);
			await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
		});

		it('drpFeridas - explicação e followUp', async () => {
			const context = cont.quickReplyContext('drpFeridas', 'drpFeridas');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpFeridas);
			await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
		});

		it('drpVerrugas - explicação e followUp', async () => {
			const context = cont.quickReplyContext('drpVerrugas', 'drpVerrugas');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpVerrugas);
			await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
		});

		it('drpCorrimento - explicação e followUp', async () => {
			const context = cont.quickReplyContext('drpCorrimento', 'drpCorrimento');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpCorrimento);
			await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
		});
	});

	describe('drpNaoTomei - Não tomei', () => {
		it('intro, não combina - msg e quiz', async () => {
			const context = cont.quickReplyContext('drpNaoTomei', 'drpNaoTomei');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpNaoTomei.text1);
			await expect(quiz.answerQuiz).toBeCalledWith(context, 'deu_ruim_nao_tomei');
		});

		it('intro, combina - msg and question', async () => {
			const context = cont.quickReplyContext('drpNaoTomei', 'drpNaoTomei');
			context.state.user = { voucher_type: 'combina' };
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpNaoTomei.text1);
			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpNaoTomei.combina, await getQR(flow.deuRuimPrep.drpNaoTomei));
			await expect(quiz.answerQuiz).not.toBeCalledWith(context, 'deu_ruim_nao_tomei');
		});

		it('drpQuizStart, combina clicou na primeira opção - vai pro quiz deu_ruim_nao_tomei', async () => {
			const context = cont.quickReplyContext('drpQuizStart', 'drpQuizStart');
			await handler(context);

			await expect(quiz.answerQuiz).toBeCalledWith(context, 'deu_ruim_nao_tomei');
		});

		it('drpQuizCombina, combina clicou na segunda opção - vê msg e vai pro followUp', async () => {
			const context = cont.quickReplyContext('drpQuizCombina', 'drpQuizCombina');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpNaoTomei.combinaEnd);
			await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
		});

		it('deuRuimPrepFim - falar com humano', async () => {
			const context = cont.quickReplyContext('deuRuimPrepFim', 'deuRuimPrepFim');
			await handler(context);

			await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.followUpTriagem);
		});

		it('deuRuimNPrepFim - falar com humano', async () => {
			const context = cont.quickReplyContext('deuRuimNPrepFim', 'deuRuimNPrepFim');
			await handler(context);

			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});
	});
});

describe('deuRuimNaoPrep', async () => {
	it('intro', async () => {
		const context = cont.quickReplyContext('deuRuimNaoPrep', 'deuRuimNaoPrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.text1, await getQR(flow.deuRuimNaoPrep));
	});

	it('drnpArrisquei - triagem com questionário', async () => {
		const context = cont.quickReplyContext('drnpArrisquei', 'drnpArrisquei');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpArrisquei);
		await expect(quiz.answerQuiz).toBeCalledWith(context, 'triagem');
	});

	it('drnpParaMim - explicação e falar com humano', async () => {
		const context = cont.quickReplyContext('drnpParaMim', 'drnpParaMim');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpParaMim);
		await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.followUpTriagem);
	});

	it('drnpMedoTestar - explicação e triagem sem questionário', async () => {
		const context = cont.quickReplyContext('drnpMedoTestar', 'drnpMedoTestar');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpMedoTestar);
		await expect(context.sendText).toBeCalledWith(flow.triagemSQ.intro, await getQR(flow.triagemSQ));
	});

	it('drnpIST - explicação e opções', async () => {
		const context = cont.quickReplyContext('drnpIST', 'drnpIST');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpIST.text1, await getQR(flow.deuRuimNaoPrep.drnpIST));
	});

	it('drnpBolhas - explicação e followUp', async () => {
		const context = cont.quickReplyContext('drnpBolhas', 'drnpBolhas');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpBolhas);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	it('drnpFeridas - explicação e followUp', async () => {
		const context = cont.quickReplyContext('drnpFeridas', 'drnpFeridas');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpFeridas);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	it('drnpVerrugas - explicação e followUp', async () => {
		const context = cont.quickReplyContext('drnpVerrugas', 'drnpVerrugas');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpVerrugas);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	it('drnpCorrimento - explicação e followUp', async () => {
		const context = cont.quickReplyContext('drnpCorrimento', 'drnpCorrimento');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpCorrimento);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	describe('drnpPEPNao', async () => {
		it('intro', async () => {
			const context = cont.quickReplyContext('drnpPEPNao', 'drnpPEPNao');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpPEPNao.text1, await getQR(flow.deuRuimNaoPrep.drnpPEPNao));
		});

		it('drnpParou28 - explicação e falar com humano', async () => {
			const context = cont.quickReplyContext('drnpParou28', 'drnpParou28');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpPEPNao.drnpParou28);
			await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.drnpPEPNao.followUpAgendamento);
		});

		it('drnpEfeito - explicação e falar com humano', async () => {
			const context = cont.quickReplyContext('drnpEfeito', 'drnpEfeito');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpPEPNao.drnpEfeito);
			await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.drnpPEPNao.followUpAgendamento);
		});

		it('drnpPerdeu - explicação e falar com humano', async () => {
			const context = cont.quickReplyContext('drnpPerdeu', 'drnpPerdeu');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpPEPNao.drnpPerdeu);
			await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.drnpPEPNao.followUpAgendamento);
		});

		it('drnpExposicao - explicação e falar com humano', async () => {
			const context = cont.quickReplyContext('drnpExposicao', 'drnpExposicao');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpPEPNao.drnpExposicao);
			await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.drnpPEPNao.followUpAgendamento);
		});

		it('drnpTomei28 - explicação e falar com humano', async () => {
			const context = cont.quickReplyContext('drnpTomei28', 'drnpTomei28');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpPEPNao.drnpTomei28);
			await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.drnpPEPNao.followUpAgendamento);
		});
	});
});

describe('alarmePrep', async () => {
	it('intro', async () => {
		const context = cont.quickReplyContext('alarmePrep', 'alarmePrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.text1, await getQR(flow.alarmePrep));
	});

	it('alarmeOK - verificar voucher', async () => {
		const context = cont.quickReplyContext('alarmeOK', 'alarmeOK');
		await handler(context);

		await expect(duvidas.alarmeOK).toBeCalledWith(context);
	});

	it('alarmeSobDemanda - explicação e menu', async () => {
		const context = cont.quickReplyContext('alarmeSobDemanda', 'alarmeSobDemanda');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.comoTomando.sobDemanda);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});

	it('alarmeDiaria - opções', async () => {
		const context = cont.quickReplyContext('alarmeDiaria', 'alarmeDiaria');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.comoAjudo.text1, await getQR(flow.alarmePrep.comoAjudo));
	});

	it('alarmeCancelar - explicação e menu', async () => {
		const context = cont.quickReplyContext('alarmeCancelar', 'alarmeCancelar');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeCancelar);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});

	describe('alarme - escolher hora', async () => {
		it('alarmeNaHora - página 1 e lista de horários', async () => {
			const context = cont.quickReplyContext('alarmeNaHora', 'alarmeNaHora');
			await handler(context);

			await expect(context.setState).toBeCalledWith({ alarmePage: 1, pageKey: 'askHorario' });
			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeNaHora1, await duvidas.alarmeHorario(context.state.alarmePage, context.state.pageKey, 1));
		});

		it('alarmeNaHora - mais cedo', async () => {
			const context = cont.quickReplyContext('pageaskHorario0', 'alarmeNaHora');
			await handler(context);

			await expect(duvidas.receivePage).toBeCalledWith(context);
			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeNaHora1, await duvidas.alarmeHorario(context.state.alarmePage, context.state.pageKey, 1));
		});

		it('alarmeNaHora - mais tarde', async () => {
			const context = cont.quickReplyContext('pageHorario2', 'alarmeNaHora');
			await handler(context);

			await expect(duvidas.receivePage).toBeCalledWith(context);
			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeNaHora1, await duvidas.alarmeHorario(context.state.alarmePage, context.state.pageKey, 1));
		});

		it('pageHorario - escolhe hora e vê minutos', async () => {
			const context = cont.quickReplyContext('askHorario10', 'alarmeMinuto');
			await handler(context);

			await expect(context.setState).toBeCalledWith({ alarmeHora: await context.state.lastQRpayload.replace('askHorario', ''), dialog: 'alarmeMinuto' });
			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeNaHora2, await duvidas.alarmeMinuto(context.state.alarmeHora));
		});

		it('alarmeFinal - encerra, manda request e vai pro menu', async () => {
			const context = cont.quickReplyContext('alarmeFinal1', 'alarmeFinal');
			await handler(context);

			await expect(context.setState).toBeCalledWith({ alarmeMinuto: await context.state.lastQRpayload.replace('alarmeFinal', ''), dialog: 'alarmeFinal' });
			await expect(prepAPI.putUpdateReminderBefore)
				.toBeCalledWith(context.session.user.id, 1, await duvidas.buildChoiceTimeStamp(context.state.alarmeHora, context.state.alarmeMinuto));
			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeFinal);
			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});
	});

	describe('alarme - escolher intervalo', async () => {
		it('alarmeJaTomei', async () => {
			const context = cont.quickReplyContext('alarmeJaTomei', 'alarmeJaTomei');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeJaTomei.text1, await getQR(flow.alarmePrep.alarmeJaTomei));
		});

		it('alarmeTempo10 - esolhe uma opção, salva o intervalo e manda a request', async () => {
			const context = cont.quickReplyContext('alarmeTempo10', 'alarmeTempoFinal');
			await handler(context);

			await expect(context.setState).toBeCalledWith({ alarmeTempo: `${await context.state.lastQRpayload.replace('alarmeTempo', '')} minutes`, dialog: 'alarmeTempoFinal' });
			await expect(prepAPI.putUpdateReminderAfter).toBeCalledWith(context.session.user.id, 1, context.state.alarmeTempo);
			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeJaTomei.text2);
			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});
	});

	describe('alarmeAcabar - avisar quando acabar os comprimidos', async () => {
		it('intro - espera data', async () => {
			const context = cont.quickReplyContext('alarmeAcabar', 'alarmeAcabar');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeAcabar.text1);
		});

		it('alarmeAcabar - entra data inválida', async () => {
			const context = cont.textContext('foobar', 'alarmeAcabar');
			await handler(context);

			await expect(duvidas.alarmeDate).toBeCalledWith(context);
			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeAcabar.text1);
		});

		it('alarmeAcabar - vê opções de frascos', async () => {
			const context = cont.quickReplyContext('alarmeAcabarFrascos', 'alarmeAcabarFrascos');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeAcabar.text2, await getQR(flow.alarmePrep.alarmeAcabar));
		});

		it('alarmeAcabarFinal - escolheu opção, faz request e encerra', async () => {
			const context = cont.quickReplyContext('alarmeFrasco1', 'alarmeAcabarFinal');
			await handler(context);

			await expect(context.setState).toBeCalledWith({ alarmeFrasco: await context.state.lastQRpayload.replace('alarmeFrasco', ''), dialog: 'alarmeAcabarFinal' });
			await expect(prepAPI.putUpdateAlarme).toBeCalledWith(context.session.user.id, context.state.dataUltimaConsulta, context.state.alarmeFrasco);
			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeAcabar.text3);
			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});
	});
});

describe('Quero voltar a tomar prep', async () => {
	it('voltarTomarPrep', async () => {
		const context = cont.quickReplyContext('voltarTomarPrep', 'voltarTomarPrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.queroVoltarTomar.text1);
		await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.drnpPEPNao.followUpAgendamento);
	});
});

describe('Tomei - tomeiPrep', async () => {
	it('intro - mostra opções de hora', async () => {
		const context = cont.quickReplyContext('tomeiPrep', 'tomeiPrep');
		await handler(context);

		await expect(context.setState).toBeCalledWith({ alarmePage: 1, pageKey: 'askTomei' });
		await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.text1, await duvidas.alarmeHorario(context.state.alarmePage, context.state.pageKey, 1));
	});

	it('tomeiHoraDepois - escolheu opção e vê outras opções, formatadas diferente', async () => {
		const context = cont.quickReplyContext('askTomei10', 'tomeiHoraDepois');
		await handler(context);

		await expect(context.setState).toBeCalledWith({ tomeiHora: await context.state.lastQRpayload.replace('askTomei', ''), dialog: 'tomeiHoraDepois' });
		await expect(context.setState).toBeCalledWith({ alarmePage: 1, pageKey: 'askDepois' });
		await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.text2, await duvidas.alarmeHorario(context.state.alarmePage, context.state.pageKey, 2));
	});

	it('tomeiFinal - escolheu opção, faz request e encerra', async () => {
		const context = cont.quickReplyContext('askDepois12', 'tomeiFinal');
		await handler(context);

		await expect(context.setState).toBeCalledWith({ tomeiDepois: await context.state.lastQRpayload.replace('askDepois', ''), dialog: 'tomeiFinal' });
		await expect(prepAPI.putUpdateTomei).toBeCalledWith(context.session.user.id, context.state.tomeiHora, context.state.tomeiDepois);
		await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.text3);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});
});

it('triagemCQ_entrar - manda msg e vai pro menu', async () => {
	const context = cont.quickReplyContext('triagemCQ_entrar', 'triagemCQ_entrar');
	await handler(context);

	await expect(context.sendText).toBeCalledWith(flow.triagemCQ.entrarEmContato);
	await expect(mainMenu.sendMain).toBeCalledWith(context);
});


describe('autoteste2', async () => {
	it('do menu não prep - see intro msg and offer options', async () => {
		const context = cont.quickReplyContext('autoteste2Intro', 'autoteste2Intro');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.autoteste2.intro);
		await expect(context.sendText).toBeCalledWith(flow.autoteste2.offerType, await getQR(flow.autoteste2.offerTypeBtn));
	});

	it('da triagem - offer options without intro', async () => {
		const context = cont.quickReplyContext('autoteste2', 'autoteste2');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.autoteste2.offerType, await getQR(flow.autoteste2.offerTypeBtn));
	});

	it('autoCorreio - ask endereço', async () => {
		const context = cont.quickReplyContext('autoCorreio', 'autoCorreio');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.autoteste2.autoCorreio);
	});

	it('autoCorreio - receive endereço, save it and go to autoCorreioEnd', async () => {
		const context = cont.textContext('Rua foobar', 'autoCorreio');
		await handler(context);

		await expect(context.setState).toBeCalledWith({ endereco: context.state.whatWasTyped, dialog: 'autoCorreioEnd' });
	});

	it('autoCorreioEnd - make endereço request, send msg and go to main main', async () => {
		const context = cont.quickReplyContext('autoCorreioEnd', 'autoCorreioEnd');
		await handler(context);

		await expect(prepAPI.putRecipientPrep).toBeCalledWith(context.session.user.id, { address: context.state.endereco });
		await expect(context.sendText).toBeCalledWith(flow.autoteste2.autoCorreioEnd);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});

	it('autoServico - see options depending on voucher type and city', async () => {
		const context = cont.quickReplyContext('autoServico', 'autoServico');
		await handler(context);

		await expect(duvidas.autotesteServico).toBeCalledWith(context);
	});

	it('autoServicoSisprepSP - get cityType and go to autoServicoSP', async () => {
		const context = cont.quickReplyContext('autoServicoSisprepSP1', 'autoServico');
		await handler(context);

		await expect(context.setState).toBeCalledWith({ cityType: await context.state.lastQRpayload.replace('autoServicoSisprepSP', ''), dialog: 'autoServicoSP' });
	});

	it('autoServicoSP - see info message', async () => {
		const context = cont.quickReplyContext('autoServicoSP', 'autoServicoSP');
		await handler(context);

		await expect(duvidas.sendAutoServicoMsg).toBeCalledWith(context, context.state.cityType);
	});
});
