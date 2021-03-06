const cont = require('./context');
const flow = require('../app/utils/flow');
// const opt = require('../app/utils/options');
const handler = require('../index');
const MaAPI = require('../app/chatbot_api');
const quiz = require('../app/utils/quiz');
const prepAPI = require('../app/utils/prep_api');
const consulta = require('../app/utils/consulta');
const timer = require('../app/utils/timer');
const duvidas = require('../app/utils/duvidas');
const checkQR = require('../app/utils/checkQR');
const mainMenu = require('../app/utils/mainMenu');
const joinToken = require('../app/utils/joinToken');
const help = require('../app/utils/helper');
const mailer = require('../app/utils/mailer');
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
jest.mock('../app/utils/joinToken');
jest.mock('../app/utils/mailer');
jest.mock('../app/utils/labels');
jest.mock('../app/utils/prep_api');

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
		context.state.lastQRpayload, context.state.lastQRpayload);
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

describe('recrutamentoTimer', () => {
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


describe('join - já tomo prep', () => {
	it('intro - texto e botões', async () => {
		const context = cont.quickReplyContext('join', 'join');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.join.intro.text1, await getQR(flow.join.intro));
	});

	it('voltou - outro texto e botões', async () => {
		const context = cont.quickReplyContext('join2', 'join2');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.join.intro.text2, await getQR(flow.join.intro));
	});

	it('joinPrep - explicação e espera token', async () => {
		const context = cont.quickReplyContext('joinPrep', 'joinPrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.join.joinPrep.text1);
		await expect(context.sendText).toBeCalledWith(flow.join.askPrep.text1, await getQR(flow.join.askPrep));
	});

	it('joinPrep - Entra texto', async () => {
		const context = cont.textContext('foobar', 'joinPrep');
		await handler(context);

		await expect(joinToken.handlePrepToken).toBeCalledWith(context, await prepAPI.putCombinaToken(context.session.user.id, context.state.whatWasTyped));
	});

	it('joinCombina - explicação e confirmação', async () => {
		const context = cont.quickReplyContext('joinCombina', 'joinCombina');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.join.joinCombina.text1);
		await expect(context.sendText).toBeCalledWith(flow.join.joinCombina.text2, await getQR(flow.join.joinCombina));
	});

	it('joinCombinaAsk - pede voucher', async () => {
		const context = cont.quickReplyContext('joinCombinaAsk', 'joinCombinaAsk');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.join.joinCombinaAsk.text1, await getQR(flow.join.joinCombinaAsk));
	});

	it('joinCombinaAsk - Entra texto', async () => {
		const context = cont.textContext('foobar', 'joinCombinaAsk');
		await handler(context);

		await expect(joinToken.handleCombinaToken).toBeCalledWith(context, await prepAPI.putCombinaToken(context.session.user.id, context.state.whatWasTyped));
	});

	it('joinCombinaCity - Mostra opções de cidade', async () => {
		const context = cont.quickReplyContext('joinCombinaCity', 'joinCombinaCity');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.join.joinCombina.city, await checkQR.buildCombinaCity());
	});


	it('combinaCity - Escolhe opção e vai pro fim', async () => {
		const context = cont.quickReplyContext('combinaCity1', 'joinCombinaEnd');
		await handler(context);

		await expect(context.setState).toBeCalledWith({ combinaCity: await context.state.lastQRpayload.replace('combinaCity', ''), dialog: 'joinCombinaEnd' });
	});

	it('joinCombinaEnd - Faz request e encerra fluxo', async () => {
		const context = cont.quickReplyContext('joinCombinaEnd', 'joinCombinaEnd');
		await handler(context);

		await expect(prepAPI.putRecipientPrep).toBeCalledWith(context.session.user.id, { combina_city: help.combinaCityDictionary[context.state.combinaCity] });
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

		await expect(joinToken.joinSus).toBeCalledWith(context);
	});

	it('joinNaoSabe - explicações e volta pro join', async () => {
		const context = cont.quickReplyContext('joinNaoSabe', 'joinNaoSabe');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.join.joinNaoSabe.text1);
		await expect(context.sendText).toBeCalledWith(flow.join.joinNaoSabe.prep);
		await expect(context.sendText).toBeCalledWith(flow.join.joinNaoSabe.combina);
		await expect(context.sendText).toBeCalledWith(flow.join.joinNaoSabe.sus);
		await expect(context.sendText).toBeCalledWith(flow.join.intro.text2, await getQR(flow.join.intro));
	});

	it('joinNaoToma - vai pro greetings somente', async () => {
		const context = cont.quickReplyContext('joinNaoToma', 'greetings');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.greetings.text1);
		await expect(context.sendText).toBeCalledWith(flow.greetings.text2);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});
});


describe('duvidasPrep - Dúvidas de usuário prep', () => {
	it('intro - texto e botões', async () => {
		const context = cont.quickReplyContext('duvidasPrep', 'duvidasPrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.text1, await getQR(flow.duvidasPrep));
	});

	// it('dpEfeitos - mosta menu de efeitos', async () => {
	// 	const context = cont.quickReplyContext('dpEfeitos', 'dpEfeitos');
	// 	await handler(context);

	// 	await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpEfeitos.text1, await getQR(flow.deuRuimPrep.drpEfeitos));
	// });

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

describe('duvidasNaoPrep', () => {
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

	it('dnpParaMim - explicação e opções', async () => {
		const context = cont.quickReplyContext('dnpParaMim', 'dnpParaMim');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasNaoPrep.dnpParaMim.text1, await getQR(flow.duvidasNaoPrep.dnpParaMim));
	});

	it('querFalar - pergunta se quer falar com humano', async () => {
		const context = cont.quickReplyContext('querFalar', 'querFalar');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasNaoPrep.querFalar.text1, await getQR(flow.duvidasNaoPrep.querFalar));
	});

	it('duvidasQuiz - starts duvidas_nao_prep quiz', async () => {
		const context = cont.quickReplyContext('duvidasQuiz', 'duvidasQuiz');
		await handler(context);

		await expect(quiz.answerQuiz).toBeCalledWith(context, 'duvidas_nao_prep');
	});

	it('dnpMeTestar - explicação e autoteste', async () => {
		const context = cont.quickReplyContext('dnpMeTestar', 'dnpMeTestar');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasNaoPrep.dnpMeTestar);
		await expect(context.sendText).toBeCalledWith(flow.autoteste.intro);
		await expect(duvidas.opcaoAutoteste).toBeCalledWith(context);
	});
});


describe('deuRuimPrep', () => {
	it('intro', async () => {
		const context = cont.quickReplyContext('deuRuimPrep', 'deuRuimPrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.text1, await checkQR.checkDeuRuimPrep(context, await getQR(flow.deuRuimPrep)));
	});

	it('drpFamilia - explicação e prepDuvidaFollowUp', async () => {
		const context = cont.quickReplyContext('drpFamilia', 'drpFamilia');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpFamilia1);
		await expect(context.typing).toBeCalledWith(1000 * 30);
		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpFamilia2);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	it('drpParceiros - explicação e prepDuvidaFollowUp', async () => {
		const context = cont.quickReplyContext('drpParceiros', 'drpParceiros');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpParceiros1);
		await expect(context.typing).toBeCalledWith(1000 * 30);
		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpParceiros2);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	it('drpAmigos - explicação e prepDuvidaFollowUp', async () => {
		const context = cont.quickReplyContext('drpAmigos', 'drpAmigos');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpAmigos);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	describe('drpEfeitos', () => {
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

	describe('drpIST', () => {
		it('intro', async () => {
			const context = cont.quickReplyContext('drpIST', 'drpIST');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.text1, await getQR(flow.deuRuimPrep.drpIST));
		});

		it('drpBolhas - explicação e followUp', async () => {
			const context = cont.quickReplyContext('drpBolhas', 'drpBolhas');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpBolhas1);
			await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpBolhas2);
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

	it('drpViolencia - explicação e prepDuvidaFollowUp', async () => {
		const context = cont.quickReplyContext('drpViolencia', 'drpViolencia');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpViolencia);
		await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
	});

	describe('drpNaoTomei - Não tomei PrEP', () => {
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

			await expect(duvidas.prepDuvidaFollowUp).toBeCalledWith(context);
		});
	});
});

describe('deuRuimNaoPrep', () => {
	it('intro', async () => {
		const context = cont.quickReplyContext('deuRuimNaoPrep', 'deuRuimNaoPrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.text1, await getQR(flow.deuRuimNaoPrep));
	});

	it('drnpArrisquei - triagem com questionário', async () => {
		const context = cont.quickReplyContext('drnpArrisquei', 'drnpArrisquei');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.triagem.intro);
		await expect(quiz.answerQuiz).toBeCalledWith(context, 'triagem');
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

	it('drnpBolhas - explicação e falar com humano', async () => {
		const context = cont.quickReplyContext('drnpBolhas', 'drnpBolhas');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpBolhas1);
		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpBolhas2);
		await expect(mainMenu.falarComHumano).toBeCalledWith(context);
	});

	it('drnpFeridas - explicação e falar com humano', async () => {
		const context = cont.quickReplyContext('drnpFeridas', 'drnpFeridas');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpFeridas);
		await expect(mainMenu.falarComHumano).toBeCalledWith(context);
	});

	it('drnpVerrugas - explicação e falar com humano', async () => {
		const context = cont.quickReplyContext('drnpVerrugas', 'drnpVerrugas');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpVerrugas);
		await expect(mainMenu.falarComHumano).toBeCalledWith(context);
	});

	it('drnpCorrimento - explicação e falar com humano', async () => {
		const context = cont.quickReplyContext('drnpCorrimento', 'drnpCorrimento');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpIST.drpCorrimento);
		await expect(mainMenu.falarComHumano).toBeCalledWith(context);
	});

	describe('drnpPEPNao', () => {
		it('intro', async () => {
			const context = cont.quickReplyContext('drnpPEPNao', 'drnpPEPNao');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpPEPNao.text1, await getQR(flow.deuRuimNaoPrep.drnpPEPNao));
		});

		it('drnpTomeiTudo - explicação e falar com humano', async () => {
			const context = cont.quickReplyContext('drnpTomeiTudo', 'drnpTomeiTudo');
			await handler(context);

			await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.drnpPEPNao.drnpTomeiTudo);
		});

		it('drnpNaoSentiBem - explicação e falar com humano', async () => {
			const context = cont.quickReplyContext('drnpNaoSentiBem', 'drnpNaoSentiBem');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpPEPNao.drnpNaoSentiBem1);
			await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpPEPNao.drnpNaoSentiBem2);
			await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.drnpPEPNao.drnpNaoSentiBem3);
		});

		it('drnpPerdi - explicação e falar com humano', async () => {
			const context = cont.quickReplyContext('drnpPerdi', 'drnpPerdi');
			await handler(context);

			await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.drnpPEPNao.drnpPerdi);
		});

		it('drnpExposicao - explicação e falar com humano', async () => {
			const context = cont.quickReplyContext('drnpExposicao', 'drnpExposicao');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpPEPNao.drnpExposicao1);
			await expect(context.sendText).toBeCalledWith(flow.deuRuimNaoPrep.drnpPEPNao.drnpExposicao2);
			await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.drnpPEPNao.drnpExposicao3);
		});

		it('drnpTomeiCerto - explicação e falar com humano', async () => {
			const context = cont.quickReplyContext('drnpTomeiCerto', 'drnpTomeiCerto');
			await handler(context);

			await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.deuRuimNaoPrep.drnpPEPNao.drnpTomeiCerto);
		});
	});

	it('drnpViolencia - explicação e falar com humano', async () => {
		const context = cont.quickReplyContext('drnpViolencia', 'drnpViolencia');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.drpViolencia);
		await expect(mainMenu.falarComHumano).toBeCalledWith(context);
	});
});

describe('alarmePrep', () => {
	it('intro', async () => {
		const context = cont.quickReplyContext('alarmePrep', 'alarmePrep');
		await handler(context);

		await expect(duvidas.sendAlarmeIntro).toBeCalledWith(context, await checkQR.buildAlarmeBtn(context.state.has_alarm), context.state.has_alarm);
	});

	it('alarmeConfigurar - verificar voucher', async () => {
		const context = cont.quickReplyContext('alarmeConfigurar', 'alarmeConfigurar');
		await handler(context);

		await expect(duvidas.alarmeConfigurar).toBeCalledWith(context);
	});

	it('alarmeSobDemanda - explicação e opções', async () => {
		const context = cont.quickReplyContext('alarmeSobDemanda', 'alarmeSobDemanda');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.sobDemanda);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});

	it('alarmeDiaria - opções', async () => {
		const context = cont.quickReplyContext('alarmeDiaria', 'alarmeDiaria');
		await handler(context);

		await expect(duvidas.askHorario).toBeCalledWith(context, flow.alarmePrep.alarmeNaHora1);
	});

	it('alarmeCancelar - chama alarmeCancelar com request', async () => {
		const context = cont.quickReplyContext('alarmeCancelar', 'alarmeCancelar');
		await handler(context);

		await expect(duvidas.alarmeCancelar).toBeCalledWith(context, await prepAPI.putRecipientPrep(context.session.user.id, { cancel_prep_reminder: 1 }));
	});

	it('alarmeCancelarConfirma - monta mensagem e manda com opções', async () => {
		const context = cont.quickReplyContext('alarmeCancelarConfirma', 'alarmeCancelarConfirma');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.cancelarConfirma.text2, await getQR(flow.alarmePrep.cancelarConfirma));
	});

	describe('alarme - escolher hora antes', () => {
		it('alarmeNaHora - pede horario', async () => {
			const context = cont.quickReplyContext('alarmeNaHora', 'alarmeNaHora');
			await handler(context);

			await expect(duvidas.askHorario).toBeCalledWith(context, flow.alarmePrep.alarmeNaHora1);
		});

		it('alarmeNaHora - recebe horario', async () => {
			const context = cont.textContext('askHorario', 'askHorario');
			await handler(context);

			await expect(duvidas.checkHorario).toBeCalledWith(context, 'alarmeHora', 'alarmeFinal', 'askHorario');
		});

		it('alarmeFinal - encerra, manda request e vai pro menu', async () => {
			const context = cont.quickReplyContext('alarmeFinal1', 'alarmeFinal');
			context.state.reminderSet = {};
			await handler(context);

			await expect(context.setState).toBeCalledWith({ reminderSet: { prep_reminder_before: 1, prep_reminder_before_interval: await help.dateHorario(context.state.alarmeHora) } });
			await expect(prepAPI.putUpdateReminderBefore).toBeCalledWith(context.session.user.id, context.state.reminderSet.prep_reminder_before_interval);
			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeFinal);
			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeFollowUp, await getQR(flow.alarmePrep.alarmeFollowUp));
		});
	});

	describe('alarme - escolher hora depois', () => {
		it('alarmeJaTomei - Pede horário', async () => {
			const context = cont.quickReplyContext('alarmeJaTomei', 'alarmeJaTomei');
			await handler(context);

			await expect(context.setState).toBeCalledWith({ dialog: 'askJaTomei' });
			await duvidas.askHorario(context, flow.alarmePrep.alarmeJaTomei1);
			await expect(duvidas.askHorario).toBeCalledWith(context, flow.alarmePrep.alarmeJaTomei1);
		});

		it('alarmeJaTomei - Recebe horário', async () => {
			const context = cont.textContext('askJaTomei', 'askJaTomei');
			context.state.whatWasTyped = 'foobar';
			await handler(context);

			await expect(duvidas.checkHorario).toBeCalledWith(context, 'alarmeHora', 'alarmeJaTomeiFinal', 'askJaTomei');
		});


		it('alarmeJaTomeiFinal - encerra, manda request e vai pro menu', async () => {
			const context = cont.quickReplyContext('alarmeJaTomeiFinal1', 'alarmeJaTomeiFinal');
			context.state.reminderSet = {};
			await handler(context);

			await expect(context.setState).toBeCalledWith({ reminderSet: { prep_reminder_after: 1, prep_reminder_after_interval: await help.dateHorario(context.state.alarmeHora) } });
			await expect(prepAPI.putUpdateReminderAfter).toBeCalledWith(context.session.user.id, context.state.reminderSet.prep_reminder_after_interval);
			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeFinal);
			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeFollowUp, await getQR(flow.alarmePrep.alarmeFollowUp));
		});
	});
});

describe('alarmeAcabar - avisar quando acabar os comprimidos', () => {
	it('intro - espera data', async () => {
		const context = cont.quickReplyContext('alarmeAcabar', 'alarmeAcabar');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeAcabar.text1);
	});

	it('alarmeAcabarErro - entra data inválida', async () => {
		const context = cont.textContext('foobar', 'alarmeAcabarErro');
		await handler(context);

		await expect(duvidas.alarmeDate).toBeCalledWith(context);
		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeAcabar.invalid);
	});

	it('alarmeAcabar - vê opções de frascos', async () => {
		const context = cont.quickReplyContext('alarmeAcabarFrascos', 'alarmeAcabarFrascos');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeAcabar.text2, await getQR(flow.alarmePrep.alarmeAcabar));
	});

	it('alarmeConfirmaData - vê opções', async () => {
		const context = cont.quickReplyContext('alarmeConfirmaData', 'alarmeConfirmaData');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeConfirmaData, await getQR(flow.alarmePrep.alarmeConfirmaDataBtn));
	});

	it('alarmeSemMedicacao - chama alarmeSemMedicacao', async () => {
		const context = cont.quickReplyContext('alarmeSemMedicacao', 'alarmeSemMedicacao');
		await handler(context);

		await expect(duvidas.alarmeSemMedicacao).toBeCalledWith(context);
	});

	it('alarmeAcabarFinal - escolheu opção, faz request e encerra', async () => {
		const context = cont.quickReplyContext('alarmeFrasco1', 'alarmeAcabarFinal');
		context.state.reminderSet = {};
		await handler(context);

		await expect(duvidas.alarmeAcabarFinal).toBeCalledWith(context,
			await prepAPI.putUpdateAlarme(context.session.user.id, context.state.dataUltimaConsulta, context.state.alarmeFrasco, context.state.reminderSet));
	});
});

describe('Quero voltar a tomar prep', () => {
	it('voltarTomarPrep', async () => {
		const context = cont.quickReplyContext('voltarTomarPrep', 'voltarTomarPrep');
		await handler(context);

		await expect(mainMenu.falarComHumano).toBeCalledWith(context, null, flow.queroVoltarTomar.text1);
	});
});

describe('Tomei - tomeiPrep', () => {
	it('intro - mostra opções de hora', async () => {
		const context = cont.quickReplyContext('tomeiPrep', 'tomeiPrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.intro, await getQR(flow.tomeiPrep.introBtn));
	});

	it('tomouPrep - mostra opções de hora', async () => {
		const context = cont.quickReplyContext('tomouPrep', 'tomouPrep');
		await handler(context);

		await expect(duvidas.askHorario).toBeCalledWith(context, flow.tomeiPrep.horas);
	});

	it('tomouPrep - user enters horario', async () => {
		const context = cont.textContext('10:30', 'tomouPrep');
		await handler(context);

		await expect(duvidas.checkHorario).toBeCalledWith(context, 'askTomei', 'tomeiHoraDepois', 'tomouPrep');
	});

	it('tomeiHoraDepois - escolheu opção, salva o dado e vê outras opções, formatadas diferente', async () => {
		const context = cont.quickReplyContext('askTomei10', 'tomeiHoraDepois');
		await handler(context);

		await expect(context.setState).toBeCalledWith({ dialog: 'askProxima' });
		await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.askProxima.intro, await getQR(flow.tomeiPrep.askProxima));
	});

	it('tomeiFinal - escolheu opção, faz request e encerra', async () => {
		const context = cont.quickReplyContext('askProxima12', 'tomeiFinal');
		await handler(context);

		await expect(context.setState).toBeCalledWith({ askProxima: await context.state.lastQRpayload.replace('askProxima', ''), dialog: 'tomeiFinal' });
		await expect(prepAPI.putUpdateNotificacao24).toBeCalledWith(
			context.session.user.id, await help.dateHorario(context.state.askTomei), await duvidas.buildChoiceDuration(null, context.state.askProxima),
		);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});

	it('NaoTomouPrep - vê opções', async () => {
		const context = cont.quickReplyContext('NaoTomouPrep', 'NaoTomouPrep');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.naoTomou, await getQR(flow.tomeiPrep.naoTomouBtn));
	});

	it('naoTransou - chama duvidas.naoTransouEnd', async () => {
		const context = cont.quickReplyContext('naoTransou', 'naoTransou');
		await handler(context);

		await expect(duvidas.naoTransouEnd).toBeCalledWith(context);
	});

	it('transou - sisprep, vê falar com humanos', async () => {
		const context = cont.quickReplyContext('transou', 'transou');
		context.state.user = { voucher_type: 'sisprep' };
		await handler(context);

		await expect(mainMenu.falarComHumano).toBeCalledWith(context, '', flow.tomeiPrep.transou);
	});

	it('transou - combina, vê telefone da cidade e menu', async () => {
		const context = cont.quickReplyContext('transou', 'transou');
		context.state.user = { voucher_type: 'combina', combina_city: 1 };
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.transou);
		await expect(duvidas.showCombinaContact).toBeCalledWith(context);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});

	it('transou - sus, vê telefone e menu', async () => {
		const context = cont.quickReplyContext('transou', 'transou');
		context.state.user = { voucher_type: 'sus' };

		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.transou);
		await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.contatoSUS);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});
});

it('triagemCQ_entrar - manda msg e vai pro menu', async () => {
	const context = cont.quickReplyContext('triagemCQ_entrar', 'triagemCQ_entrar');
	await handler(context);

	await expect(context.sendText).toBeCalledWith(flow.triagemCQ.entrarEmContato);
	await expect(mainMenu.sendMain).toBeCalledWith(context);
});


describe('autoteste', () => {
	it('do menu não prep - see intro msg and offer options', async () => {
		const context = cont.quickReplyContext('autotesteIntro', 'autotesteIntro');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.autoteste.intro);
		await expect(duvidas.opcaoAutoteste).toBeCalledWith(context);
	});

	it('da triagem - offer options without intro', async () => {
		const context = cont.quickReplyContext('autoteste', 'autoteste');
		await handler(context);

		await expect(duvidas.opcaoAutoteste).toBeCalledWith(context);
	});

	it('autoCorreio - ask endereço', async () => {
		const context = cont.quickReplyContext('autoCorreio', 'autoCorreio');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.autoteste.autoCorreio);
	});

	it('autoCorreioConfirma - shows contato and buttons', async () => {
		const context = cont.quickReplyContext('autoCorreioConfirma', 'autoCorreioConfirma');
		context.state.autoCorreioContato = 'foobar';
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.autoteste.autoCorreioConfirma.replace('<CONTATO>', context.state.autoCorreioContato), await getQR(flow.autoteste.autoCorreioConfirmaBtn));
	});

	it('autoCorreioContato - ask contato', async () => {
		const context = cont.quickReplyContext('autoCorreioContato', 'autoCorreioContato');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.autoteste.autoCorreioContato);
	});

	it('autoCorreioEnd - make endereço request, send msg and go to main menu', async () => {
		const context = cont.quickReplyContext('autoCorreioEnd', 'autoCorreioEnd');
		await handler(context);

		await expect(prepAPI.postAutoTeste).toBeCalledWith(context.session.user.id, context.state.autoCorreioEndereco, context.state.autoCorreioContato);
		await expect(mailer.sendMailCorreio).toBeCalledWith('AMANDA - Novo autoteste por correio', await help.buildMailAutoTeste(context), context.state.user.city, null);
		await expect(context.sendText).toBeCalledWith(flow.autoteste.autoCorreioEnd);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});

	it('autoCorreioEnd - combina load e-mail, make endereço request, send msg and go to main menu', async () => {
		const context = cont.quickReplyContext('autoCorreioEnd', 'autoCorreioEnd');
		context.state.user = { voucher_type: 'combina' };
		const expectedEmail = process.env.MAILAUTOTESTECOMBINA;
		await handler(context);

		await expect(prepAPI.postAutoTeste).toBeCalledWith(context.session.user.id, context.state.autoCorreioEndereco, context.state.autoCorreioContato);
		await expect(mailer.sendMailCorreio).toBeCalledWith('AMANDA - Novo autoteste por correio', await help.buildMailAutoTeste(context), context.state.user.city, expectedEmail);
		await expect(context.sendText).toBeCalledWith(flow.autoteste.autoCorreioEnd);
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

describe('triagemSQ - triagem sem questionário', () => {
	it('intro - see msg and options', async () => {
		const context = cont.quickReplyContext('triagemSQ', 'triagemSQ');
		await handler(context);


		await expect(context.sendText).toBeCalledWith(flow.triagemSQ.intro, await getQR(flow.triagemSQ));
	});
});

describe('testagem', () => {
	it('intro - envia mensagem de tipos por cidade', async () => {
		const context = cont.quickReplyContext('testagem', 'testagem');
		await handler(context);

		await expect(duvidas.sendAutotesteMsg).toBeCalledWith(context);
	});

	it('testeServiço - falar com humano', async () => {
		const context = cont.quickReplyContext('testeServiço', 'testeServiço');
		await handler(context);

		await expect(mainMenu.falarComHumano).toBeCalledWith(context);
	});

	it('testeOng - falar com humano', async () => {
		const context = cont.quickReplyContext('testeOng', 'testeOng');
		await handler(context);

		await expect(mainMenu.falarComHumano).toBeCalledWith(context);
	});
});

describe('notificações', () => {
	describe('alarme', () => {
		it('notiAlarmeA_Sim - atualiza stop_soneca com true', async () => {
			const context = cont.quickReplyContext('notiAlarmeA_Sim', 'notiAlarmeA_Sim');
			await handler(context);

			await expect(prepAPI.postRecipientTookMedicine).toBeCalledWith(context.session.user.id);
			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});

		it('notiAlarmeA_Nao - atualiza stop_soneca com false', async () => {
			const context = cont.quickReplyContext('notiAlarmeA_Nao', 'notiAlarmeA_Nao');
			await handler(context);

			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});

		it('notiAlarmeB_Sim - atualiza rolou_consulta com true e pergunta da última consulta', async () => {
			const context = cont.quickReplyContext('notiAlarmeB_Sim', 'notiAlarmeB_Sim');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeAcabar.text1);
		});

		it('notiAlarmeB_Nao - atualiza rolou_consulta com false', async () => {
			const context = cont.quickReplyContext('notiAlarmeB_Nao', 'notiAlarmeB_Nao');
			await handler(context);

			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});

		it('notiAlarmeC_Ok - só manda pro menu', async () => {
			const context = cont.quickReplyContext('notiAlarmeC_Ok', 'notiAlarmeC_Ok');
			await handler(context);

			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});
	});

	describe('tomei', () => {
		it('notiTomeiA_Sim - atualiza repeat_notification com true', async () => {
			const context = cont.quickReplyContext('notiTomeiA_Sim', 'notiTomeiA_Sim');
			await handler(context);

			await expect(prepAPI.putRecipientPrep).toBeCalledWith(context.session.user.id, { repeat_notification: true });
			await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.notiTransou.replace('<HORA>', help.getTomarHoras(context)));
			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});

		it('notiTomeiA_Nao - atualiza repeat_notification com false', async () => {
			const context = cont.quickReplyContext('notiTomeiA_Nao', 'notiTomeiA_Nao');
			await handler(context);

			await expect(prepAPI.putRecipientPrep).toBeCalledWith(context.session.user.id, { repeat_notification: false });
			await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.notiNaoTransou);
			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});

		it('notiTomeiB_Demanda - atualiza repeat_notification com true', async () => {
			const context = cont.quickReplyContext('notiTomeiB_Demanda', 'notiTomeiB_Demanda');
			await handler(context);

			await expect(prepAPI.putRecipientPrep).toBeCalledWith(context.session.user.id, { repeat_notification: true });
			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});

		it('notiTomeiB_Diariamente - vê opções', async () => {
			const context = cont.quickReplyContext('notiTomeiB_Diariamente', 'notiTomeiB_Diariamente');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.notiDiariamente, await getQR(flow.tomeiPrep.notiDiariamenteBtn));
		});

		it('notiTomeiB_Diariamente, não quer configurar - atualiza repeat_notification com true', async () => {
			const context = cont.quickReplyContext('notiNaoConfiguraDiario', 'notiNaoConfiguraDiario');
			await handler(context);

			await expect(prepAPI.putRecipientPrep).toBeCalledWith(context.session.user.id, { repeat_notification: true });
			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});

		it('notiTomeiC_Sim/askNotiTomei - manda horários', async () => {
			const context = cont.quickReplyContext('notiTomeiC_Sim', 'notiTomeiC_Sim');
			await handler(context);

			await expect(context.setState).toBeCalledWith({ dialog: 'askNotiTomei' });
			await expect(duvidas.askHorario).toBeCalledWith(context, flow.tomeiPrep.askNotiTomei);
		});

		it('notiTomeiC_Sim/askNotiTomei - recebe horários', async () => {
			const context = cont.textContext('askNotiTomei', 'askNotiTomei');
			context.state.whatWasTyped = 'foobar';
			await handler(context);

			await expect(duvidas.checkHorario).toBeCalledWith(context, 'askNotiTomei', 'askNotiProxima', 'askNotiTomei');
		});

		it('askNotiTomeiDepois/askNotiProxima - escolheu opção, salva o dado e vê outras opções, formatadas diferente', async () => {
			const context = cont.quickReplyContext('askNotiTomeiDepois', 'askNotiTomeiDepois');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.askNotiHoje.replace('<HORA>', help.getTomarHoras(context)));
			await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.askNotiAmanha.replace('<HORA>', help.getTomarHoras(context)));
			await expect(context.setState).toBeCalledWith({ dialog: 'askNotiProxima' });
			await expect(duvidas.askHorario).toBeCalledWith(context, flow.tomeiPrep.askNotiAsk);
		});

		it('askNotiTomeiDepois/askNotiProxima - manda horário', async () => {
			const context = cont.textContext('askNotiProxima', 'askNotiProxima');
			context.state.whatWasTyped = 'foobar';
			await handler(context);

			await expect(duvidas.checkHorario).toBeCalledWith(context, 'askNotiProxima', 'notiTomeiFinal', 'askNotiProxima');
		});

		it('notiTomeiFinal - escolheu opção, faz request e encerra', async () => {
			const context = cont.quickReplyContext('notiTomeiFinal', 'notiTomeiFinal');
			await handler(context);

			await expect(prepAPI.putUpdateNotificacao24).toBeCalledWith(
				context.session.user.id, await help.dateHorario(context.state.askNotiTomei), await help.dateHorario(context.state.askNotiProxima),
			);
			await expect(context.setState).toBeCalledWith({ askProxima: context.state.askNotiProxima });
			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});

		it('notiTomeiC_Nao - manda msg', async () => {
			const context = cont.quickReplyContext('notiTomeiC_Nao', 'notiTomeiC_Nao');
			await handler(context);

			await expect(context.sendText).toBeCalledWith(flow.tomeiPrep.notiNaoTransou);
			await expect(mainMenu.sendMain).toBeCalledWith(context);
		});
	});
});

describe('noProjeto', () => {
	it('intro - vê mensagem e opções', async () => {
		const context = cont.quickReplyContext('noProjeto', 'noProjeto');
		await handler(context);

		await expect(context.sendText).toBeCalledWith(flow.noProjeto.text1, await getQR(flow.noProjeto));
	});

	it('noProjetoYes - faz requisição, atualiza dado, mostra mensagem e manda pro menu', async () => {
		const context = cont.quickReplyContext('noProjetoYes', 'noProjetoYes');
		await handler(context);

		await expect(prepAPI.postTestPrep).toBeCalledWith(context.session.user.id, false);
		await expect(context.setState).toBeCalledWith({ user: await prepAPI.getRecipientPrep(context.session.user.id) });
		await expect(context.sendText).toBeCalledWith(flow.noProjeto.noProjetoYes);
		await expect(mainMenu.sendMain).toBeCalledWith(context);
	});
});
