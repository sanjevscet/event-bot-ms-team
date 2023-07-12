import {
  TeamsActivityHandler,
  CardFactory,
  TurnContext,
  AdaptiveCardInvokeValue,
  AdaptiveCardInvokeResponse,
} from "botbuilder";
import rawWelcomeCard from "./adaptiveCards/welcome.json";
import eventCard from "./adaptiveCards/event.json";
import rawLearnCard from "./adaptiveCards/learn.json";
import eventSubmit from "./adaptiveCards/eventSubmit.json";
import eventList from "./adaptiveCards/eventList.json";
import eventDetail from "./adaptiveCards/eventDetail.json";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import axios from "axios";
import { ENV } from "./Env";

export interface DataInterface {
  likeCount: number;
}

export class TeamsBot extends TeamsActivityHandler {
  // record the likeCount
  likeCountObj: { likeCount: number };

  constructor() {
    super();

    this.likeCountObj = { likeCount: 0 };

    this.onMessage(async (context, next) => {
      console.log("Running with Message Activity.");

      let txt = context.activity.text;
      const removedMentionText = TurnContext.removeRecipientMention(context.activity);
      if (removedMentionText) {
        // Remove the line break
        txt = removedMentionText.toLowerCase().replace(/\n|\r/g, "").trim();
      }

      // Trigger command by IM text
      switch (txt) {
        case "welcome": {
          const card = AdaptiveCards.declareWithoutData(rawWelcomeCard).render();
          await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
          break;
        }
        case "event": {
          const card = AdaptiveCards.declareWithoutData(eventCard).render();
          await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
          break;
        }

        case "getevents": {
          const { data } = await axios.get("http://localhost:1414/getEvents");
          console.log({ data })
          const card = AdaptiveCards.declare(eventList).render({ data });
          await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
          break;
        }

        case "learn": {
          this.likeCountObj.likeCount = 0;
          const card = AdaptiveCards.declare<DataInterface>(rawLearnCard).render(this.likeCountObj);
          await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
          break;
        }
        /**
         * case "yourCommand": {
         *   await context.sendActivity(`Add your response here!`);
         *   break;
         * }
         */
      }

      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let cnt = 0; cnt < membersAdded.length; cnt++) {
        if (membersAdded[cnt].id) {
          const card = AdaptiveCards.declareWithoutData(rawWelcomeCard).render();
          await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
          break;
        }
      }
      await next();
    });
  }

  // Invoked when an action is taken on an Adaptive Card. The Adaptive Card sends an event to the Bot and this
  // method handles that event.
  async onAdaptiveCardInvoke(
    context: TurnContext,
    invokeValue: AdaptiveCardInvokeValue
  ): Promise<AdaptiveCardInvokeResponse> {
    const text = context.activity.text
    console.log({ action: invokeValue.action.verb, data: invokeValue.action.data, replyToId: context.activity.replyToId })
    if (invokeValue.action.verb === "getEventDetails") {
      console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
      console.log("invokeValue", JSON.stringify(invokeValue));
      console.log("context", JSON.stringify(context));
      console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
      const id = invokeValue.action.data.id
      const url = ENV.API_URL + '/getEvents/' + id;
      const { data } = await axios.get(url);
      console.log({ url, data });
      // const { msg } = data;
      // eventSubmit.body[1].text = "API called to get Events";

      // const card = AdaptiveCards.declare<DataInterface>(eventSubmit).render();
      // await context.updateActivity({
      //   type: "message",
      //   id: context.activity.replyToId,
      //   attachments: [CardFactory.adaptiveCard(card)],
      // });

      const card = AdaptiveCards.declare(eventDetail).render(data);
      await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });

      return { statusCode: 200, type: undefined, value: undefined };

    }
    // The verb "userlike" is sent from the Adaptive Card defined in adaptiveCards/learn.json
    if (invokeValue.action.verb === "eventSubmit") {
      // this.likeCountObj.likeCount++;
      const url = ENV.API_URL + '/saveEvent';
      const payload = invokeValue.action.data
      const { data } = await axios.post(url, payload);
      console.log({ url, payload, data });
      const { msg } = data;
      eventSubmit.body[1].text = msg;

      const card = AdaptiveCards.declare<DataInterface>(eventSubmit).render();
      await context.updateActivity({
        type: "message",
        id: context.activity.replyToId,
        attachments: [CardFactory.adaptiveCard(card)],
      });
      return { statusCode: 200, type: undefined, value: undefined };
    }
    if (invokeValue.action.verb === "userlike") {
      this.likeCountObj.likeCount++;
      const card = AdaptiveCards.declare<DataInterface>(rawLearnCard).render(this.likeCountObj);
      await context.updateActivity({
        type: "message",
        id: context.activity.replyToId,
        attachments: [CardFactory.adaptiveCard(card)],
      });
      return { statusCode: 200, type: undefined, value: undefined };
    }
  }
}
