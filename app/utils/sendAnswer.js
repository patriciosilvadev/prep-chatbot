const MaAPI = require('../chatbot_api');
const { createIssue } = require('../send_issue');
const { Sentry } = require('./helper');
const { separateString } = require('./helper');

module.exports.sendAnswer = async (context) => { // send answer from posicionamento
	// await context.setState({ currentTheme: await context.state.knowledge.knowledge_base.find(x => x.type === 'posicionamento') });
	await context.typingOn();
	await context.setState({ currentTheme: await context.state.knowledge.knowledge_base[0] });

	// console.log('currentTheme', currentTheme);
	if (context.state.currentTheme && ((context.state.currentTheme.answer && context.state.currentTheme.answer.length > 0)
		|| (context.state.currentTheme.saved_attachment_type !== null && context.state.currentTheme.saved_attachment_id !== null))) {
		await MaAPI.logAskedEntity(context.session.user.id, context.state.politicianData.user_id, context.state.currentTheme.entities[0].id);
		if (context.state.currentTheme.answer) { // if there's a text asnwer we send it
			await context.setState({ resultTexts: await separateString(context.state.currentTheme.answer) });
			if (context.state.resultTexts && context.state.resultTexts.firstString) {
				await context.sendText(context.state.resultTexts.firstString);
				if (context.state.resultTexts.secondString) { await context.sendText(context.state.resultTexts.secondString);	}
			}
		}
		try {
			if (context.state.currentTheme.saved_attachment_type === 'image') { // if attachment is image
				await context.Image({ attachment_id: context.state.currentTheme.saved_attachment_id });
			}
			if (context.state.currentTheme.saved_attachment_type === 'video') { // if attachment is video
				await context.Video({ attachment_id: context.state.currentTheme.saved_attachment_id });
			}
			if (context.state.currentTheme.saved_attachment_type === 'audio') { // if attachment is audio
				await context.Audio({ attachment_id: context.state.currentTheme.saved_attachment_id });
			}
			if (context.state.currentTheme.saved_attachment_type === 'file') { // if attachment is audio
				await context.File({ attachment_id: context.state.currentTheme.saved_attachment_id });
			}
		} catch (error) {
			await Sentry.configureScope(async (scope) => { // sending to sentry
				scope.setUser({ username: context.state.name });
				scope.setExtra('state', context.state);
				throw error;
			});
		}
		await context.typingOff();
	} else { // in case there's an error
		await createIssue(context);
	}
};
