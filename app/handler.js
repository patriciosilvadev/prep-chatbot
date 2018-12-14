const MaAPI = require('./chatbot_api.js');
// const opt = require('./utils/options');
const { createIssue } = require('./send_issue');
const flow = require('./utils/flow');
const help = require('./utils/helper');
const timer = require('./utils/timer');


module.exports = async (context) => {
	try {
		// console.log(await MaAPI.getLogAction()); // print possible log actions
		if (!context.state.dialog || context.state.dialog === '' || (context.event.postback && context.event.postback.payload === 'greetings')) { // because of the message that comes from the comment private-reply
			await context.resetState();	await context.setState({ dialog: 'greetings' });
		}

		timer.createFollowUpTimer(context.session.user.id, context);

		// let user = await getUser(context)
		// we reload politicianData on every useful event
		// we update context data at every interaction that's not a comment or a post
		await context.setState({ politicianData: await MaAPI.getPoliticianData(context.event.rawEvent.recipient.id) });
		console.log(context.state.politicianData);


		await MaAPI.postRecipient(context.state.politicianData.user_id, {
			fb_id: context.session.user.id,
			name: `${context.session.user.first_name} ${context.session.user.last_name}`,
			origin_dialog: 'greetings',
			picture: context.session.user.profile_pic,
			// session: JSON.stringify(context.state),
		});
		if (context.event.isPostback) {
			await context.setState({ lastPBpayload: context.event.postback.payload });
			await context.setState({ dialog: context.state.lastPBpayload });
		} else if (context.event.isQuickReply) {
			await context.setState({ lastQRpayload: context.event.quickReply.payload });
			await context.setState({ dialog: context.state.lastQRpayload });
		} else if (context.event.isText) {
			await context.setState({ whatWasTyped: context.event.message.text });
			console.log('context.state.politicianData.use_dialogflow', context.state.politicianData.use_dialogflow);

			if (context.state.politicianData.use_dialogflow === 1) { // check if politician is using dialogFlow
				// if (context.state.whatWasTyped.length <= 255) { // check if message is short enough for apiai
				// 	await context.setState({ apiaiResp: await apiai.textRequest(context.state.whatWasTyped, { sessionId: context.session.user.id }) });
				// 	await context.setState({ resultParameters: context.state.apiaiResp.result.parameters }); // getting the entities
				// 	await context.setState({ intentName: context.state.apiaiResp.result.metadata.intentName }); // getting the intent
				// 	await checkPosition(context);
				// } else {
				// 	if (await createIssue(context, 'Não entendi sua mensagem pois ela é muito complexa. Você pode escrever novamente, de forma mais direta?')) {
				// 		await context.sendText('Não consigo entender mensagens tão longas mas já entou enviando para nossas equipe e estaremos te '
				// 			+ 'respondendo em breve.');
				// 	}
				// 	await sendMenu(context, await loadOptionPrompt(context), [opt.aboutPolitician, opt.poll_suaOpiniao, opt.participate, opt.availableIntents]);
				// }
			} else { // not using dialogFlow
				await context.setState({ dialog: 'createIssueDirect' });
			}

			// await createIssue(context, 'Não entendi sua mensagem pois ela é muito complexa. Você pode escrever novamente, de forma mais direta?');
		}
		switch (context.state.dialog) {
		case 'greetings':
			await context.sendText(flow.greetings.text1);
			await context.sendText(flow.greetings.text2);
			break;
		case 'mainMenu':
			await context.sendText(flow.mainMenu.text1);
			break;
		case 'createIssueDirect':
			await createIssue(context);
			break;
		} // end switch case
	} catch (error) {
		const date = new Date();
		console.log(`Parece que aconteceu um erro as ${date.toLocaleTimeString('pt-BR')} de ${date.getDate()}/${date.getMonth() + 1} =>`);
		console.log(error);
		await context.sendText('Ops. Tive um erro interno. Tente novamente.'); // warning user

		await help.Sentry.configureScope(async (scope) => { // sending to sentry
			scope.setUser({ username: context.session.user.first_name });
			scope.setExtra('state', context.state);
			throw error;
		});
	} // catch
}; // handler function
