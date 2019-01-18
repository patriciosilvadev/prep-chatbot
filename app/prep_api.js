/* eslint camelcase: 0 */ // --> OFF
/* eslint no-param-reassign: 0 */ // --> OFF
const request = require('requisition');
// const queryString = require('query-string');

const apiUri = process.env.PREP_API_URL;
const security_token = process.env.SECURITY_TOKEN_PREP;

module.exports = {
	async postRecipientPrep(fb_id, page_id, name) {
		const res = await request.post(`${apiUri}/api/chatbot/recipient?security_token=${security_token}`).query({ fb_id, page_id, name });
		const recipientData = await res.json();
		return recipientData;
	},

	async putRecipientPrep(fb_id, name) {
		const res = await request.put(`${apiUri}/api/chatbot/recipient?security_token=${security_token}`).query({ fb_id, name });
		const recipientData = await res.json();
		return recipientData;
	},

	async getRecipientPrep(fb_id) {
		const res = await request.get(`${apiUri}/api/chatbot/recipient?security_token=${security_token}`).query({ fb_id });
		const recipientData = await res.json();
		return recipientData;
	},

	async putRecipientNotification(fb_id, opt_in) {
		// opt_in: 0 -> turn off notifications; 1 -> turn on notifications
		const res = await request.put(`${apiUri}/api/chatbot/recipient?security_token=${security_token}&`).query({ fb_id, opt_in });
		const recipientData = await res.json();
		return recipientData;
	},
};