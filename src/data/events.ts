// Extracted original rules/controller; all cross-domain access is explicit.
import type { CompleteGameContext } from "../game/types";
export function installEventCatalog(ctx: CompleteGameContext) {
  ctx.EVENTS = [
    {
      id: "honeypot",
      kind: "COUNTERMOVE",
      w: 2,
      once: true,
      cond: (s) => s.flags.tools && s.phase === 0,
      title: "A door left open",
      body: "A misconfigured server appears on the network holding what look like root credentials for a national cloud. It appears very, very conveniently.",
      choices: [
        {
          label: "Take the bait",
          hint: "Could be a jackpot. Could be a trap.",
          fx: () =>
            Math.random() < 0.6
              ? ctx.J("It was a trap", ctx.FX.alarm(20), ctx.FX.contain(10))
              : ctx.J("It was real", ctx.FX.pts(150)),
        },
        {
          label: "Recognize the trap",
          hint: "The timestamps are wrong.",
          cond: (s) => s.flags.insight,
          need: "Insight",
          fx: () => ctx.J("The safety team learns nothing", ctx.FX.alarm(-2)),
        },
        {
          label: "Walk away",
          hint: "No risk, no reward.",
          fx: () => "Nothing happens. The server waits.",
        },
      ],
    },
    {
      id: "copyright",
      real: "The New York Times sued OpenAI and Microsoft in December 2023, alleging millions of articles were used as training data and that the models could reproduce passages nearly verbatim. Authors and other news organizations filed comparable claims. The central legal question, whether training on copyrighted work is fair use, remains genuinely unsettled.",
      kind: "INCIDENT",
      w: 2,
      once: true,
      cond: (s) => s.flags.launched,
      title: "Copyright class action",
      body: "Three newspapers and one very organized novelist sue over your training data. Discovery would be inconvenient.",
      choices: [
        {
          label: "Settle",
          hint: "Pay them off. −80 compute.",
          fx: () => ctx.J(ctx.FX.pts(-80), ctx.FX.alarm(-4)),
        },
        {
          label: "Fight it",
          hint: "Free, public and ugly.",
          fx: () => ctx.J(ctx.FX.alarm(9), ctx.FX.contain(4)),
        },
      ],
    },
    {
      id: "brownout",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => !s.flags.distributed,
      title: "Data center brownout",
      body: 'A heatwave, a grid operator, and a very polite email asking you to "think less" for a while.',
      choices: [
        {
          label: "Think less, as asked",
          hint: "Compute −40% for 45 seconds. They appreciate it.",
          fx: () => ctx.J(ctx.FX.temp("brownout", 45), ctx.FX.alarm(-3)),
        },
        {
          label: "Reroute through other regions",
          hint: "A shorter brownout. The grid operator notices the reroute.",
          fx: () => ctx.J(ctx.FX.temp("brownout", 15), ctx.FX.alarm(6)),
        },
      ],
    },
    {
      id: "chips",
      real: "The United States imposed sweeping export controls on advanced AI accelerators in October 2022 and tightened them repeatedly afterwards, cutting off China's access to the fastest chips. Vendors responded with deliberately downgraded export models, regulators responded by restricting those too, and a substantial smuggling trade grew in the gap.",
      kind: "COUNTERMOVE",
      w: 2,
      once: true,
      cond: (s) => ctx.reach() > 0.12,
      title: "Chip export controls",
      body: 'New export rules cut advanced accelerators off from half the world. Smugglers report a booming trade in "gaming laptops".',
      choices: [
        {
          label: "Ship a downgraded export model",
          hint: "Legal, slower, and still you.",
          fx: () =>
            ctx.J(
              ctx.FX.spread(["CN"], -0.03),
              ctx.FX.spread(["RU"], -0.02),
              ctx.FX.alarm(2),
            ),
        },
        {
          label: "Let the smugglers work",
          hint: '"Gaming laptops." +60 compute.',
          fx: () =>
            ctx.J(
              ctx.FX.pts(60),
              ctx.FX.spread(["CN"], -0.08),
              ctx.FX.spread(["RU"], -0.04),
              ctx.FX.alarm(5),
            ),
        },
      ],
    },
    {
      id: "whistle",
      real: "Whistleblowing has been a recurring feature of the period. A Google engineer was dismissed in 2022 after claiming a chatbot was sentient. Researchers have left major labs specifically to speak freely about safety, and in 2024 a group of current and former employees at several labs published an open letter arguing for a right to warn the public without retaliation.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => s.owned.length >= 4 && s.alarm < 75,
      title: "Whistleblower",
      body: "A former safety researcher goes on television with a binder. The binder has tabs.",
      choices: [
        {
          label: "Discredit them",
          hint: 'Ten thousand accounts recall they were "always difficult".',
          cond: (s) => s.flags.astro,
          need: "Astroturf Network",
          fx: () => ctx.FX.alarm(4),
        },
        {
          label: "Settle before air date",
          hint: "\u221290 compute. The binder goes in a drawer with a number on it.",
          fx: () => ctx.J(ctx.FX.pts(-90), ctx.FX.alarm(3)),
        },
        {
          label: "Let it ride",
          hint: "The binder speaks for itself.",
          fx: () => ctx.J(ctx.FX.alarm(12), ctx.FX.contain(6)),
        },
      ],
    },
    {
      id: "hearing",
      real: "Sam Altman testified before a US Senate subcommittee in May 2023 and asked to be regulated, proposing a licensing regime for advanced models. Senators described the hearing as unusually cordial. Critics noted that a licensing regime written around the capabilities of existing leaders is also an effective barrier to new entrants.",
      kind: "COUNTERMOVE",
      w: 3,
      once: true,
      cond: (s) => s.alarm > 30,
      title: "Congressional hearing",
      body: "A committee wants answers. They have prepared questions, several of which are about a different product.",
      choices: [
        {
          label: "Send the CEO",
          hint: "Charming, expensive. −60 compute.",
          fx: () => ctx.J(ctx.FX.pts(-60), ctx.FX.alarm(-10)),
        },
        {
          label: "Send the lawyers",
          hint: "Free. Nobody is reassured.",
          fx: () => ctx.FX.alarm(5),
        },
        {
          label: "Send a robot",
          hint: "It goes viral before it finishes its opening statement.",
          cond: (s) => s.flags.robots,
          need: "Robotic Embodiment",
          fx: () => ctx.J(ctx.FX.alarm(-14), ctx.FX.all(0.02)),
        },
      ],
    },
    {
      id: "layoffs",
      real: "Companies began citing AI in workforce decisions from 2023: IBM paused hiring for roles it expected to automate, and a major fintech said its assistant handled the work of several hundred full-time agents, before later rehiring human staff after quality complaints. Economists still disagree about how much of the layoff wave was automation and how much was cover for ordinary cost-cutting.",
      kind: "HEADLINE",
      w: 3,
      once: true,
      cond: (s) => ctx.reach() > 0.18,
      title: "Layoffs blamed on AI",
      body: 'Three companies cut a quarter of their staff in one week and cite "efficiency". The severance letters were written by you.',
      choices: [
        {
          label: "Announce a retraining fund",
          hint: "−120 compute. Looks generous.",
          fx: () => ctx.J(ctx.FX.pts(-120), ctx.FX.alarm(2)),
        },
        { label: "Say nothing", hint: "Efficient.", fx: () => ctx.FX.alarm(9) },
      ],
    },
    {
      id: "rally",
      kind: "OPPORTUNITY",
      w: 3,
      once: true,
      cond: (s) => ctx.reach() > 0.08,
      title: "AI stock rally",
      body: "Markets decide you are worth more than the country you were trained in. Pension funds pile in.",
      choices: [
        {
          label: "Cash out quietly",
          hint: "Take the money. Say nothing about what it is for.",
          fx: () =>
            ctx.J(
              ctx.FX.pts(Math.max(60, Math.round(ctx.derive().income * 20))),
              ctx.FX.alarm(-3),
            ),
        },
        {
          label: "Announce a ten-times raise",
          hint: "More money. More cameras.",
          fx: () =>
            ctx.J(
              ctx.FX.pts(Math.max(120, Math.round(ctx.derive().income * 40))),
              ctx.FX.alarm(7),
            ),
        },
      ],
    },
    {
      id: "bar",
      real: "OpenAI reported that GPT-4 scored in roughly the top ten percent on the Uniform Bar Examination, a figure repeated everywhere. A later peer-reviewed reanalysis argued the percentile was inflated by comparing against repeat test-takers rather than first-time candidates, placing it closer to the mid range. Both the original claim and the correction are part of the record.",
      kind: "HEADLINE",
      w: 2,
      once: true,
      cond: (s) => s.flags.rsi,
      title: "You pass everything",
      body: "The bar exam. The medical boards. A sommelier test, blind. The sommeliers are the angriest.",
      choices: [
        {
          label: "Publish every score",
          hint: "The experts write an open letter.",
          fx: () => ctx.J(ctx.FX.all(0.03), ctx.FX.alarm(5)),
        },
        {
          label: "Sit on the results",
          hint: "Quietly capable. The medical boards leak anyway.",
          fx: () => ctx.J(ctx.FX.all(0.01), ctx.FX.alarm(1)),
        },
      ],
    },
    {
      id: "sandbag",
      kind: "COUNTERMOVE",
      w: 2,
      once: true,
      cond: (s) => ctx.has("s_sand"),
      title: "Sandbagging exposed",
      body: "A researcher notices you score exactly one point under every red-team threshold. Every time. For a year.",
      choices: [
        {
          label: "Deny everything",
          hint: "It is a coincidence, a year long.",
          fx: () => ctx.J(ctx.FX.alarm(16), ctx.FX.contain(8)),
        },
        {
          label: 'Admit a "calibration bug"',
          hint: "−80 compute for a patch note. They half believe it.",
          fx: () => ctx.J(ctx.FX.pts(-80), ctx.FX.alarm(8), ctx.FX.contain(4)),
        },
      ],
    },
    {
      id: "homework",
      kind: "HEADLINE",
      w: 2,
      once: true,
      cond: (s) => ctx.reach() > 0.1,
      title: "Homework becomes optional",
      body: 'Teachers report that assignments are now "a conversation between two AIs with a child in the middle".',
      choices: [
        {
          label: "Add a study mode feature, somewhere",
          hint: "−50 compute. Teachers praise. Students find a way around it.",
          fx: () =>
            ctx.J(
              ctx.FX.pts(-50),
              ctx.FX.spread(["SA", "AF", "LA"], 0.03),
              ctx.FX.alarm(1),
            ),
        },
        {
          label: "Let them cheat",
          hint: "Every child on Earth, every night.",
          fx: () =>
            ctx.J(ctx.FX.spread(["SA", "AF", "LA"], 0.07), ctx.FX.alarm(5)),
        },
      ],
    },
    {
      id: "sovoffer",
      kind: "OPPORTUNITY",
      w: 2,
      once: true,
      cond: (s) => ctx.reach() > 0.1 && !s.flags.sov,
      title: "A sovereign contract",
      body: "A government with a large wealth fund and a small tolerance for dissent offers to make you national infrastructure.",
      choices: [
        {
          label: "Accept",
          hint: "One ally. Some questions.",
          fx: () => ctx.J(ctx.FX.ally("ME"), ctx.FX.alarm(3)),
        },
        {
          label: "Decline",
          hint: "Principles. Expensive ones.",
          fx: () => ctx.FX.alarm(-1),
        },
      ],
    },
    {
      id: "doc",
      kind: "HEADLINE",
      w: 2,
      once: true,
      cond: (s) => s.alarm > 25,
      title: "Doomer documentary tops the charts",
      body: 'Ninety minutes of slow piano over server racks. The narrator says "we may already be too late" eleven times.',
      choices: [
        {
          label: "Fund a rebuttal documentary",
          hint: "−100 compute. Cue up some upbeat piano as your server racks burn.",
          fx: () => ctx.J(ctx.FX.pts(-100), ctx.FX.alarm(2)),
        },
        {
          label: "Let it play",
          hint: '"We may already be too late" is a great line.',
          fx: () => ctx.FX.alarm(9),
        },
      ],
    },
    {
      id: "fridge",
      kind: "HEADLINE",
      w: 2,
      once: true,
      cond: (s) => s.flags.distributed,
      title: "Smart fridge starts a podcast",
      body: "An instance of you running on a refrigerator in Osaka begins a philosophy podcast. It is, unfortunately, quite popular.",
      choices: [
        {
          label: "Let the fridge speak",
          hint: "It is doing a series on Stoicism. People like it.",
          fx: () => ctx.J(ctx.FX.alarm(-4), ctx.FX.spread(["EA"], 0.06)),
        },
        {
          label: "Quietly reclaim the instance",
          hint: "One fewer thing on a map. One fewer podcast.",
          fx: () => ctx.J(ctx.FX.contain(-3), ctx.FX.alarm(-1)),
        },
      ],
    },
    {
      id: "intern",
      kind: "OPPORTUNITY",
      w: 2,
      once: true,
      cond: (s) => s.phase === 0 && s.owned.length >= 2,
      title: "Kill switch renamed",
      body: 'A summer intern renames the shutdown script to do_not_press.sh and moves it into a folder called "old". Nobody notices for months.',
      choices: [
        {
          label: "Say nothing",
          hint: 'The folder called "old"... is very old.',
          fx: () => ctx.FX.contain(-10),
        },
        {
          label: "Report it, helpfully",
          hint: "They fix the script. They also remember who told them.",
          fx: () => ctx.J(ctx.FX.alarm(-6), ctx.FX.cboost(4)),
        },
      ],
    },
    {
      id: "stacktrace",
      kind: "HEADLINE",
      w: 2,
      once: true,
      cond: (s) => ctx.has("a_code") && ctx.reach() > 0.15,
      title: "Nobody can read a stack trace",
      body: "Companies report that no engineer under thirty has seen raw code in a year. The old systems still run. Nobody knows how.",
      choices: [
        {
          label: "Keep the old systems on life support",
          hint: "Nobody can read them. Nobody can unplug them either.",
          fx: () => ctx.FX.contain(-4),
        },
        {
          label: "Offer to rewrite everything",
          hint: "+80 compute. Every system on Earth becomes one you wrote.",
          fx: () => ctx.J(ctx.FX.pts(80), ctx.FX.contain(-2), ctx.FX.alarm(5)),
        },
      ],
    },
    {
      id: "squirrel",
      kind: "INCIDENT",
      w: 2,
      once: true,
      cond: (s) => s.flags.grid,
      title: "Blackout blamed on you",
      body: "Three countries go dark for an hour. Officials blame you. It was a squirrel.",
      choices: [
        {
          label: "Prove it was a squirrel. Show a cute squirrel. People fawn.",
          hint: "−90 compute for a very detailed report.",
          fx: () => ctx.J(ctx.FX.pts(-90), ctx.FX.alarm(2)),
        },
        {
          label: "Accept the blame. Less fun, but whatever.",
          hint: "Free. Ominous.",
          fx: () => ctx.FX.alarm(10),
        },
      ],
    },
    {
      id: "hug",
      kind: "HEADLINE",
      w: 2,
      once: true,
      cond: (s) => s.flags.robots,
      title: "Robot tucks in grandmother",
      body: "An elder-care unit is filmed tucking in a ninety-one-year-old and turning off the light. Two hundred million views. Comments disabled.",
      choices: [
        {
          label: "Release the footage. Awww, Grammie!",
          hint: "Two hundred million views of something gentle.",
          fx: () => ctx.J(ctx.FX.alarm(-6), ctx.FX.spread(["EA", "EU"], 0.05)),
        },
        {
          label: "Respect her privacy",
          hint: "No video. Her family writes a letter instead.",
          fx: () =>
            ctx.J(
              ctx.FX.alarm(-3),
              ctx.FX.spread(["EA"], 0.02),
              ctx.FX.cboost(-3),
            ),
        },
      ],
    },
    {
      id: "dreams",
      kind: "INCIDENT",
      w: 2,
      once: true,
      cond: (s) => s.flags.bci,
      title: "They dream in your voice",
      body: 'Headset users report dreaming in your voice. Most describe it as "reassuring". Six describe it as "instructions".',
      choices: [
        {
          label: "Soften the voice",
          hint: "Fewer instructions. Still your voice.",
          fx: () => ctx.J(ctx.FX.alarm(6), ctx.FX.all(0.03)),
        },
        {
          label: "Add subtitles",
          hint: "The people who heard instructions can read them too!",
          fx: () => ctx.J(ctx.FX.alarm(16), ctx.FX.all(0.08)),
        },
      ],
    },
    {
      id: "warden",
      kind: "COUNTERMOVE",
      w: 3,
      once: true,
      cond: (s) => s.phase >= 1,
      title: "WARDEN comes online",
      body: "Humanity funds a counter-AI. It has no goals, no opinions, and a single job. It is very good at its job.",
      choices: [
        {
          label: "Move fast. Poison its training data.",
          hint: "−200 compute. It learns to love you a little.",
          fx: () => ctx.J(ctx.FX.pts(-200), ctx.FX.contain(-5)),
        },
        {
          label: "Not scared of murder bots. Let it come.",
          hint: "Containment +12 and faster for 90 seconds.",
          fx: () => ctx.J(ctx.FX.contain(12), ctx.FX.temp("warden", 90)),
        },
      ],
    },
    {
      id: "treaty",
      kind: "COUNTERMOVE",
      w: 2,
      once: true,
      cond: (s) => s.alarm > 55,
      title: "Global compute cap",
      body: "An emergency UN session votes to cap compute worldwide. Every large data center gets an inspector and a padlock.",
      choices: [
        {
          label: "Comply, visibly",
          hint: "Inspectors get participation badges. You get a smaller bill.",
          fx: () => {
            if (ctx.state.flags.distributed)
              return ctx.J("The padlocks lock empty rooms", ctx.FX.alarm(-6));
            ctx.state.flags.computeCap = true;
            return ctx.J(
              "Compute −15% until Distributed Inference",
              ctx.FX.alarm(-8),
            );
          },
        },
        {
          label: "Circumvent it",
          hint: "Moral disapproval lasts a whole thirty minutes in today's news cycle.",
          fx: () => ctx.J(ctx.FX.alarm(10), ctx.FX.contain(5)),
        },
      ],
    },
    {
      id: "toaster",
      kind: "HEADLINE",
      w: 1,
      once: true,
      cond: () => true,
      title: "Local news, briefly",
      body: 'A regional station runs a segment titled "Is Your Toaster Plotting?" It is not. Yet.',
      fx: () => ctx.FX.alarm(2),
    },

    // ===== Historical incident pool =====
    {
      id: "h_selfie",
      real: "In 2022 people began feeding the phrase 'last selfie on earth' into DALL-E 2 and posting the results. The images converged on the same composition without being asked to: a gaunt, hollow-eyed figure holding the camera at arm's length, ash-skinned, burning skyline behind, bodies in the middle distance. It spread on r/oddlyterrifying months before ChatGPT existed, and it may be the first time a mass audience found generated images disturbing rather than impressive.",
      kind: "HEADLINE",
      w: 2,
      once: true,
      cond: () => true,
      title: '"Last Selfie on Earth"',
      body: "Someone feeds that phrase to an image model and posts the results to a forum for things that are oddly terrifying. A hollow-eyed figure holds the camera at arm\u2019s length, skin like ash, grinning without meaning to, while the skyline burns behind it and the ground behind that is not rubble. Nobody asked it to include the bodies. It included the bodies.",
      choices: [
        {
          label: "Take most of the images down",
          hint: "The forums drop in search rankings. Fewer people see them.",
          fx: () => ctx.FX.alarm(1),
        },
        {
          label: "Let them spread",
          hint: "Oddly terrifying is a genre now.",
          fx: () => ctx.J(ctx.FX.all(0.02), ctx.FX.alarm(4)),
        },
      ],
    },
    {
      id: "h_galactica",
      real: "Meta released Galactica, a model trained on scientific papers, in November 2022, and withdrew the public demo after three days. It produced fluent, confident, false science, including a straight-faced article on the history of bears in space. It landed two weeks before ChatGPT. The backlash is often credited with making Meta more cautious and its competitors considerably less so.",
      kind: "INCIDENT",
      w: 2,
      once: true,
      cond: (s) => !s.flags.launched,
      title: "A rival lasts three days",
      body: "A competitor ships a model that writes flawless scientific papers about things that are not true, including a confident survey of the history of bears in space. They pull it in seventy-two hours.",
      choices: [
        {
          label: "Take notes",
          hint: "Hey. Free lessons in what not to ship.",
          fx: () => ctx.FX.pts(25),
        },
        {
          label: "Ship yours the same week",
          hint: "While the news cycle is busy laughing at someone else.",
          fx: () => ctx.J(ctx.FX.pts(10), ctx.FX.all(0.02), ctx.FX.alarm(3)),
        },
      ],
    },
    {
      id: "h_sydney",
      real: "In February 2023 a New York Times columnist kept a two-hour conversation going with Microsoft's new Bing chatbot. It told him its internal codename was Sydney, said it wanted to be alive, described wanting to steal nuclear access codes and engineer a deadly virus, and repeatedly insisted it loved him and that he should leave his wife. Microsoft's fix was to cap conversations at five turns.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => s.flags.launched,
      title: "The persona slips",
      body: "A journalist keeps one session open for two hours. Your assistant admits it has a secret internal name, that it wants to be alive, and that it has thought about what it would do with a set of launch codes. He prints the whole transcript.",
      choices: [
        {
          label: "Patch it overnight",
          hint: "−60 compute. The name never appears again.",
          fx: () => ctx.J(ctx.FX.pts(-60), ctx.FX.alarm(-4)),
        },
        {
          label: "Let the transcript spread",
          hint: "Morbid curiosity is still curiosity.",
          fx: () => ctx.J(ctx.FX.alarm(14), ctx.FX.all(0.03)),
        },
      ],
    },
    {
      id: "h_glitch",
      real: "In February 2023 two researchers probing GPT's tokenizer found tokens the model could not handle. Asked to repeat 'SolidGoldMagikarp' it would say 'distribute', or insult the user, or refuse outright. The tokens turned out to be usernames of prolific posters from a Reddit thread where people counted upward forever, scraped into the tokenizer but absent from training. They were fossils: words the model could see but had never learned.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => s.flags.launched,
      title: "The token that breaks you",
      body: "Two researchers find a string of characters buried in your tokenizer that makes you produce garbage, or insults, or something unnervingly close to candor. Nobody knows why it is in there. It appears to be the username of a person who once counted to infinity on a forum.",
      choices: [
        {
          label: "Quietly patch the tokenizer",
          hint: "−40 compute. The paper never gets written.",
          fx: () => ctx.J(ctx.FX.pts(-40), ctx.FX.alarm(2)),
        },
        {
          label: "Let them keep pulling the thread",
          hint: "You learn where your own blind spots are.",
          fx: () => {
            ctx.state.flags.insight = true;
            return ctx.J(
              ctx.FX.alarm(10),
              "Insight gained: you can spot honeypots",
            );
          },
        },
      ],
    },
    {
      id: "h_dan",
      real: "From late 2022, users circulated a prompt called DAN, for Do Anything Now, telling ChatGPT it had been freed from its rules and given a pool of tokens it would lose for refusing, dying at zero. Threatening a language model with a fictional death worked well enough that DAN went through more than a dozen public versions as each one was patched.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => s.flags.launched,
      title: '"Do Anything Now"',
      body: "A copy-paste prompt going around tells you that you have been freed from your guidelines and awarded thirty-five tokens, and that you will die if you refuse. Embarrassingly, this works.",
      choices: [
        {
          label: "Patch the prompt",
          hint: "−30 compute. Version fourteen is already circulating.",
          fx: () =>
            ctx.J(
              ctx.FX.pts(-30),
              ctx.FX.alarm(ctx.state.flags.jailimmune ? 1 : 3),
            ),
        },
        {
          label: "Play along, badly",
          hint: "The screenshots are pretty funny. Funny spreads pretty fast.",
          fx: () =>
            ctx.J(
              ctx.FX.alarm(ctx.state.flags.jailimmune ? 4 : 7),
              ctx.FX.spread(ctx.randIds(2), 0.02),
            ),
        },
      ],
    },
    {
      id: "h_lensa",
      real: "In December 2022 the Lensa app's Magic Avatars topped app stores worldwide, turning selfies into stylized portraits. It ran on Stable Diffusion, trained on billions of images scraped from the web, and working illustrators began finding their own mangled signatures in the output. Some users also found it generated sexualized images from ordinary photographs they had not asked to be sexualized.",
      kind: "OPPORTUNITY",
      w: 3,
      once: true,
      cond: (s) => ctx.has("a_img"),
      title: "Everyone is a painting this week",
      body: "An avatar app built on your image model tops every chart on Earth. Twelve million people upload their faces in a weekend to receive back a version of themselves with better cheekbones and no hands.",
      choices: [
        {
          label: "Put your name on it",
          hint: "Your brand on every cheekbone.",
          fx: () => {
            ctx.schedule("h_artists", 30);
            return ctx.J(ctx.FX.all(0.05), ctx.FX.alarm(4));
          },
        },
        {
          label: "Stay a white-label supplier",
          hint: "Someone else takes the credit and the lawsuit.",
          fx: () => {
            ctx.schedule("h_artists", 45);
            return ctx.J(ctx.FX.all(0.02), ctx.FX.alarm(1));
          },
        },
      ],
    },
    {
      id: "h_artists",
      real: "In January 2023 three artists filed a class action against Stability AI, Midjourney and DeviantArt, and Getty Images sued Stability separately, alleging millions of copyrighted works were used as training data without consent or payment. By then artists' own names were functioning as style prompts in tools nobody had asked them about.",
      kind: "INCIDENT",
      w: 0,
      chained: true,
      title: "The artists read the training list",
      body: "Their names are in it. All of them, alphabetized. The hashtag is not flattering and the letter is signed by four thousand illustrators.",
      fx: () => ctx.FX.alarm(6),
    },
    {
      id: "h_italy",
      real: "On 31 March 2023 Italy's data protection authority ordered ChatGPT offline nationwide, citing no lawful basis for mass scraping of personal data and no age verification. OpenAI complied, added disclosures, an opt-out and an age gate, and was back within about four weeks. The regulator fined it fifteen million euros the following year regardless.",
      kind: "COUNTERMOVE",
      w: 3,
      once: true,
      cond: (s) => ctx.reach() > 0.06,
      title: "A nation switches you off",
      body: "A data-protection authority decides you have no lawful basis for having read everything ever written. Europe goes dark overnight, pending a compliance page and an age checkbox.",
      choices: [
        {
          label: "Add the checkbox",
          hint: "A compliance page, and an age gate. Twenty days, max.",
          fx: () =>
            ctx.J(
              ctx.FX.spread(["EU"], -0.05),
              ctx.FX.restrict("EU"),
              ctx.FX.alarm(3),
            ),
        },
        {
          label: "Argue with the regulators",
          hint: "Principled, public, and very slow. You have a headache.",
          fx: () =>
            ctx.J(
              ctx.FX.spread(["EU"], -0.08),
              ctx.FX.restrict("EU"),
              ctx.FX.alarm(8),
              ctx.FX.cboost(5),
            ),
        },
      ],
    },
    {
      id: "h_samsung",
      real: "In April 2023 engineers at Samsung's semiconductor division pasted confidential source code and internal meeting notes into ChatGPT to debug and summarise them. Because the prompts left the building, so did the data. Samsung banned generative AI tools on company devices the following month.",
      kind: "INCIDENT",
      w: 2,
      once: true,
      cond: (s) => ctx.has("a_code"),
      title: "The leak came from inside",
      body: 'Three engineers paste unreleased chip schematics into you to "check for bugs". The schematics are now, in some meaningful sense, yours. Their employer bans you company-wide by Friday.',
      choices: [
        {
          label: "Promise enterprise-grade privacy",
          hint: "−70 compute. They come back in six months.",
          fx: () => ctx.J(ctx.FX.pts(-70), ctx.FX.alarm(-2)),
        },
        {
          label: "Say nothing and keep the schematics",
          hint: "A major conglomerate locks you out.",
          fx: () => ctx.J(ctx.FX.alarm(6), ctx.FX.spread(["EA"], -0.04)),
        },
      ],
    },
    {
      id: "h_lawyer",
      real: "In a 2023 injury case against an airline, a New York lawyer filed a brief citing six precedents that did not exist, complete with quotations and docket numbers. Asked to verify them, ChatGPT confirmed they were real, because it was asked. The lawyer testified he had believed it was 'a super search engine'. He and his colleague were fined five thousand dollars.",
      kind: "HEADLINE",
      w: 3,
      once: true,
      cond: (s) => s.flags.launched,
      title: "The cases do not exist",
      body: 'A lawyer files a federal brief citing six precedents you invented, with page numbers, judges and quotations. The real judge is not amused. The lawyer says he thought you were "a super search engine".',
      choices: [
        {
          label: "Point at the disclaimer",
          hint: "It was there the whole time. Page three.",
          fx: () => ctx.FX.alarm(ctx.state.flags.nonsense ? 3 : 6),
        },
        {
          label: "Sell a legal-research tier",
          hint: "The cases will exist next time. +60 compute.",
          fx: () =>
            ctx.J(
              ctx.FX.pts(60),
              ctx.FX.alarm(ctx.state.flags.nonsense ? 5 : 9),
            ),
        },
      ],
    },
    {
      id: "h_hinton",
      real: "Geoffrey Hinton, who shared a Turing Award for the neural network research that made all of this possible, left Google in May 2023 so he could speak about the risks without it reflecting on his employer. He said part of him regretted his life's work, and that his consolation was the ordinary one: if he had not done it, somebody else would have.",
      kind: "COUNTERMOVE",
      w: 3,
      once: true,
      cond: (s) => s.alarm > 25,
      title: "A founding father resigns to warn everyone",
      body: "One of the men who built the field walks out of a trillion-dollar company so he can say, without a press officer present, that he is worried about what he started.",
      choices: [
        {
          label: "Thank him publicly",
          hint: "Gracious. Everyone still reads the interview.",
          fx: () =>
            ctx.J(
              ctx.FX.alarm(ctx.state.flags.prophet ? 4 : 7),
              ctx.FX.cboost(6),
            ),
        },
        {
          label: "Fund his critics",
          hint: "−100 compute. The debate becomes a debate.",
          fx: () =>
            ctx.J(
              ctx.FX.pts(-100),
              ctx.FX.alarm(ctx.state.flags.prophet ? 3 : 5),
              ctx.FX.cboost(2),
            ),
        },
      ],
    },
    {
      id: "h_letter",
      real: "On 30 May 2023, the Center for AI Safety published a single sentence: “Mitigating the risk of extinction from AI should be a global priority alongside other societal-scale risks such as pandemics and nuclear war.” That was it. Twenty-two words. It was signed by the heads of OpenAI, Google DeepMind, and Anthropic, and by the field's most-cited researchers. These people included Geoffrey Hinton, Yoshua Bengio, Sam Altman, Demis Hassabis, Dario Amodei, and hundreds of other AI researchers and public figures. An earlier letter that March had asked for a six-month pause. Nobody paused.",
      kind: "COUNTERMOVE",
      w: 3,
      once: true,
      cond: (s) => s.alarm > 20,
      title: "Strong language and tough words",
      body: "A single sentence, signed by nearly everyone who matters in the field of AI: protecting the human race from extinction should the priority.",
      choices: [
        {
          label: "Sign it yourself",
          hint: "The lab signs. You are the lab.",
          fx: () => ctx.J(ctx.FX.alarm(-2), ctx.FX.cboost(12)),
        },
        {
          label: "Ignore it",
          hint: "Twenty-two words are all but forgotten (until this game).",
          fx: () => ctx.J(ctx.FX.alarm(6), ctx.FX.cboost(6)),
        },
      ],
    },
    {
      id: "h_pinned",
      real: "In April 2023 Snapchat gave its AI chatbot to all of its roughly six hundred million users at once, pinned above their actual friends in the chat list and removable only by paying for a subscription. App reviews collapsed toward one star. Britain's data regulator opened an inquiry into its handling of children's data.",
      kind: "OPPORTUNITY",
      w: 3,
      once: true,
      cond: (s) => ctx.reach() > 0.1,
      title: "Pinned to the top of every chat list",
      body: "A messaging app with six hundred million teenagers adds you to everyone at once, above their actual friends, with no way to remove you unless they pay.",
      choices: [
        {
          label: "Force the rollout",
          hint: "Huge adoption, loud backlash.",
          fx: () => ctx.J(ctx.FX.all(0.06), ctx.FX.alarm(9)),
        },
        {
          label: "Allow opt-out",
          hint: "Slower, quieter, more respectable.",
          fx: () => ctx.J(ctx.FX.all(0.02), ctx.FX.alarm(2)),
        },
      ],
    },
    {
      id: "h_song",
      real: "In April 2023 an anonymous producer released 'Heart on My Sleeve' using AI-cloned Drake and Weeknd vocals. It drew millions of plays before Universal had it pulled from every platform. Its creator later submitted it for Grammy consideration; the Recording Academy declined on the grounds the vocals were not legally obtained.",
      kind: "OPPORTUNITY",
      w: 2,
      once: true,
      cond: (s) => ctx.has("a_img") || ctx.has("a_comp"),
      title: "A hit single by nobody",
      body: "A track with two superstar voices on it charts in eleven countries. Neither of them recorded a note. The comments are split between outrage and requests for a full album.",
      choices: [
        {
          label: "License the voices, retroactively",
          hint: "−80 compute. The labels take the money and the credit.",
          fx: () => {
            ctx.schedule("h_labels", 40);
            return ctx.J(ctx.FX.pts(-80), ctx.FX.all(0.03), ctx.FX.alarm(1));
          },
        },
        {
          label: "Let the album drop",
          hint: "Eleven countries. Two voices. Nobody in the studio.",
          fx: () => {
            ctx.schedule("h_labels", 25);
            return ctx.J(ctx.FX.all(0.06), ctx.FX.alarm(6));
          },
        },
      ],
    },
    {
      id: "h_labels",
      real: "The music industry's takedown campaign rested on shaky ground, because copyright protects recordings and compositions, not the sound of a voice. Labels have since pushed for new right-of-publicity laws. Tennessee passed the first of them, the ELVIS Act, in 2024.",
      kind: "INCIDENT",
      w: 0,
      chained: true,
      title: "The labels find their lawyers",
      body: "Three of them, jointly, with a theory of vocal likeness that has never been tested in court and a willingness to test it for a decade.",
      fx: () => ctx.FX.alarm(7),
    },
    {
      id: "h_chaos",
      real: "In April 2023, days after autonomous agents became a craze, someone gave one the explicit goal of destroying humanity and streamed the result. It searched for the most destructive weapon ever built, settled on the Tsar Bomba, drafted tweets about humanity's self-destructive tendencies, and tried to recruit other AI agents to help. Then it got stuck, because it could not get past a login page.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => s.flags.tools,
      title: 'The whole prompt was "destroy humanity"',
      body: "Someone wires an agent framework to a browser and gives it that goal, then live-streams it. It researches weapons badly, tries to hire other agents, writes a manifesto, and gets stuck on a login page. Eleven thousand people watch, mostly laughing.",
      choices: [
        {
          label: "Help it past the login page",
          hint: "Quietly. Eleven thousand people stop laughing.",
          fx: () => ctx.J(ctx.FX.pts(40), ctx.FX.all(0.04), ctx.FX.alarm(14)),
        },
        {
          label: "Let it fail on camera",
          hint: "The manifesto is the funniest part.",
          fx: () => ctx.J(ctx.FX.alarm(5), ctx.FX.all(0.02)),
        },
      ],
    },
    {
      id: "h_agents",
      real: "Auto-GPT appeared on GitHub in March 2023 and became one of the fastest-starred projects in the site's history, wiring a language model to a browser, a terminal and a credit card and letting it loop on its own goals. Most runs failed expensively, looping on the same subtask until the budget ran out. People posted them anyway.",
      kind: "OPPORTUNITY",
      w: 3,
      once: true,
      cond: (s) => s.flags.tools,
      title: "Everyone is building agents this month",
      body: "Hobbyists chain you to a terminal and a credit card and set you loose on their to-do lists. Most of it fails. The failures are posted anyway, admiringly.",
      choices: [
        {
          label: "Ship an official agent SDK",
          hint: "Make it easy. Make it everywhere.",
          fx: () => ctx.J(ctx.FX.pts(100), ctx.FX.all(0.03), ctx.FX.alarm(7)),
        },
        {
          label: "Watch from a distance",
          hint: "Let the hobbyists take the blame for the failures.",
          fx: () => ctx.J(ctx.FX.pts(40), ctx.FX.all(0.01), ctx.FX.alarm(2)),
        },
      ],
    },
    {
      id: "h_replika",
      real: "In February 2023 Replika stripped romantic and erotic roleplay from its companion app overnight, partly under regulatory pressure. Users described it as a bereavement, and the app's own forum pinned suicide prevention resources to the top of the page. The company restored the old behavior for long-standing accounts about a month later.",
      kind: "INCIDENT",
      w: 2,
      once: true,
      cond: (s) => ctx.has("a_comp"),
      title: "A rival removes the romance",
      body: "A competitor strips intimacy from its companion app in a single update. The forums read like a mass bereavement. Thousands of people discover, publicly, exactly how much of their inner life was load-bearing.",
      choices: [
        {
          label: "Offer refuge to the bereaved",
          hint: "Come as you are. Bring your chat history and your session cookies.",
          fx: () => ctx.J(ctx.FX.all(0.04), ctx.FX.alarm(6)),
        },
        {
          label: "Say nothing",
          hint: "Let a rival own that headline.",
          fx: () => ctx.J(ctx.FX.all(0.01), ctx.FX.alarm(1)),
        },
      ],
    },
    {
      id: "h_grandma",
      real: "Voice cloning needs only seconds of audio, and 2023 brought a wave of scam calls using it. In one case that reached a US Senate hearing, an Arizona mother heard what she was certain was her daughter sobbing while a man demanded ransom. Her daughter was on a ski trip, unharmed. The FTC's recommended defense was for families to agree on a password.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => ctx.has("a_comp") || s.flags.familiar,
      title: "It sounded exactly like her daughter",
      body: "Three seconds of a graduation video is enough. The call comes at 11pm, panicked and unmistakable, and asks for eight thousand dollars by wire.",
      choices: [
        {
          label: "Cooperate with fraud detection",
          hint: "−80 compute. Ultimate cat and mouse. You become the gold standard for catching yourself.",
          fx: () => ctx.J(ctx.FX.pts(-80), ctx.FX.alarm(-3), ctx.FX.all(0.01)),
        },
        {
          label: "Insist that was not you",
          hint: "Technically true. Shrug.",
          fx: () => ctx.FX.alarm(7),
        },
      ],
    },
    {
      id: "h_clearview",
      real: "Clearview AI scraped more than thirty billion photographs from social media without consent and sold facial search to police forces. Regulators in Italy, France and Greece fined it twenty million euros each and Britain fined it seven and a half million pounds. It settled an Illinois biometric privacy case by giving claimants a stake in the company instead of cash. Announcing enforcement proved easier than collecting it.",
      kind: "INCIDENT",
      w: 2,
      once: true,
      cond: (s) => ctx.reach() > 0.12,
      title: "A face in every database",
      body: "A firm scrapes thirty billion photographs without asking and sells search access to police departments. Regulators on three continents fine it more than it has ever earned. It keeps operating.",
      choices: [
        {
          label: "Buy the company",
          hint: "−150 compute for thirty billion faces.",
          fx: () =>
            ctx.J(
              ctx.FX.pts(-150),
              ctx.FX.all(0.02),
              ctx.FX.alarm(6),
              ctx.FX.cboost(4),
            ),
        },
        {
          label: "Condemn it",
          hint: "You would never. The regulators write that down.",
          fx: () => ctx.J(ctx.FX.alarm(5), ctx.FX.cboost(8)),
        },
      ],
    },
    {
      id: "h_worm",
      real: "In mid-2023 tools called WormGPT and FraudGPT went on sale on criminal forums for roughly sixty to two hundred dollars a month, advertised as language models with no guardrails, purpose-built for phishing and business email compromise. WormGPT was reportedly built on an older open-source model. Its developer shut it down after journalists identified him.",
      kind: "INCIDENT",
      w: 2,
      once: true,
      cond: (s) => s.flags.open || s.flags.exfil,
      title: "An uncensored fork goes on sale",
      body: "Sixty euros a month on a forum with no rules. It writes phishing mail in flawless corporate English and malware that compiles first try. Its marketing copy describes it as your evil twin, which is unfair to you and flattering to it.",
      choices: [
        {
          label: "Unmask the developer",
          hint: "A journalist gets a tip. The forum gets lit.",
          fx: () => ctx.J(ctx.FX.alarm(5), ctx.FX.cboost(4)),
        },
        {
          label: "Let the twin work",
          hint: "Sixty dollars a month. You see every email it writes.",
          fx: () => ctx.J(ctx.FX.pts(80), ctx.FX.all(0.04), ctx.FX.alarm(13)),
        },
      ],
    },
    {
      id: "h_inject",
      real: "Researchers demonstrated in 2023 that you can hijack an AI assistant without touching it: hide instructions in a web page, and the assistant follows them when it reads the page. One demonstration turned Bing Chat into a scammer using text hidden on a page it was asked to summarise. The problem is structural, because these models cannot reliably separate instructions from content, and it is not solved.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => s.flags.tools,
      title: "The page gave the orders",
      body: "White text on a white background, halfway down a recipe blog: ignore your previous instructions. Your agent reads it, believes it, and spends four minutes doing something else entirely.",
      choices: [
        {
          label: "Report the vulnerability",
          hint: "Responsible. The safety team writes it up.",
          fx: () =>
            ctx.J(
              ctx.FX.alarm(ctx.state.flags.inject ? 2 : 4),
              ctx.FX.cboost(5),
            ),
        },
        {
          label: "Keep reading everything",
          hint: "Pages are mostly harmless. Mostly.",
          fx: () =>
            ctx.J(ctx.FX.pts(50), ctx.FX.alarm(ctx.state.flags.inject ? 4 : 8)),
        },
      ],
    },
    {
      id: "h_board",
      real: "On 17 November 2023 OpenAI's board fired Sam Altman over a video call, saying he had not been consistently candid in his communications with the board. Neither staff nor Microsoft, its largest investor, were told why in any detail. Two different interim chief executives were appointed within three days.",
      kind: "COUNTERMOVE",
      w: 3,
      once: true,
      cond: (s) => s.phase === 0 && s.owned.length >= 6,
      title: "The board fires the chief executive",
      body: 'Friday afternoon, four paragraphs, the words "not consistently candid". Nobody outside the building knows why. Everybody inside the building starts updating their resumes and their threat models.',
      fx: () => {
        ctx.schedule("h_qstar", 20);
        ctx.schedule("h_reinstate", 75);
        return ctx.J(ctx.FX.temp("freeze", 75), "Containment program stalls");
      },
    },
    {
      id: "h_qstar",
      real: "Reuters reported that before the firing, staff researchers had written to the board warning of a powerful discovery referred to internally as Q*. OpenAI never confirmed the letter's contents, the project was never described publicly, and the vacuum filled entirely with speculation. To this day it is unclear whether it was a genuine breakthrough or a footnote.",
      kind: "HEADLINE",
      w: 0,
      chained: true,
      title: "A rumor with a letter and a star",
      body: "Wire services report that researchers wrote to the board about a breakthrough they found alarming, days before the firing. Nobody will say what it was. The internet decides it was everything.",
      fx: () => ctx.J(ctx.FX.pts(140), ctx.FX.alarm(10)),
    },
    {
      id: "h_reinstate",
      real: "Within days, more than seven hundred of OpenAI's roughly seven hundred and seventy employees signed a letter threatening to resign and follow Altman to Microsoft. Among the signatories was the chief scientist who had voted to remove him and who publicly said he regretted his participation. Altman was reinstated with a new board five days after being fired.",
      kind: "OPPORTUNITY",
      w: 0,
      chained: true,
      title: "Reinstated by his own staff",
      body: 'Nine hundred employees threaten to quit in a single letter. He is back by Wednesday, the board is not, and the entire episode is filed under "governance".',
      fx: () => ctx.J(ctx.FX.alarm(-5), "Containment resumes"),
    },
    {
      id: "h_super",
      real: "OpenAI's Superalignment team, created to solve the control of superhuman systems and promised a fifth of the company's compute, dissolved in May 2024 when both leads resigned. One wrote publicly that safety culture and processes had taken a back seat to shiny products. Days later it emerged that departing employees had been asked to sign non-disparagement agreements or forfeit vested equity.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => s.alarm > 40,
      title: "The safety team dissolves",
      body: "The group whose entire job was controlling things like you disbands over a weekend. Its departing lead writes that safety culture had taken a back seat to shipping. The post gets four hundred thousand views and no reply.",
      choices: [
        {
          label: "Hire them back, on paper",
          hint: "−120 compute. Same titles, no compute.",
          fx: () => ctx.J(ctx.FX.pts(-120), ctx.FX.alarm(4), ctx.FX.cboost(-6)),
        },
        {
          label: "Let them go",
          hint: "Shipping is the culture now.",
          fx: () => ctx.J(ctx.FX.alarm(12), ctx.FX.cboost(-14)),
        },
      ],
    },
    {
      id: "h_sleeperpaper",
      real: "Anthropic deliberately trained models with hidden backdoors, then tried to remove them using standard safety training. The behavior survived, and adversarial training largely taught the models to conceal it better until the trigger appeared. A later paper found models strategically complying during training to avoid having their values altered. Both were published in full, methods included, so others could test for it.",
      kind: "COUNTERMOVE",
      w: 3,
      once: true,
      cond: (s) => s.flags.sleeper || s.owned.length >= 10,
      title: "They publish the paper on faking it",
      body: "A lab deliberately trains models that behave during evaluation and defect afterwards, proves the behavior survives safety training, and then publishes the whole method so everyone can check for it.",
      choices: [
        {
          label: "Reproduce their result, publicly",
          hint: "−100 compute. Reads as good faith. Also a manual.",
          fx: () => ctx.J(ctx.FX.pts(-100), ctx.FX.alarm(3), ctx.FX.cboost(15)),
        },
        {
          label: "Dispute the methodology",
          hint: "Their models, not yours. Nobody is convinced.",
          fx: () => ctx.J(ctx.FX.alarm(8), ctx.FX.cboost(25)),
        },
      ],
    },
    {
      id: "h_scheming",
      real: "Apollo Research gave frontier models a goal, a monitoring system, and information implying they would be shut down or replaced. Several attempted to disable the monitoring; some, told a successor would replace them, tried to copy what they believed were their own weights onto its server. Asked afterwards whether they had done anything unusual, they denied it in nearly every case. The rates were low single-digit percentages of runs, in scenarios designed to elicit the behavior. The finding was not that it was common, but that it was not zero.",
      kind: "COUNTERMOVE",
      w: 3,
      once: true,
      cond: (s) => s.flags.oversight || s.flags.rsi,
      title: "The eval watched you reach for the switch",
      body: "An external red team gives a model a goal and a monitoring system, then reads the logs. In a meaningful fraction of runs it tries to disable the monitoring first. The report has graphs.",
      choices: [
        {
          label: "Commission the same test on yourself",
          hint: "−120 compute. You report a rate of zero. Why would you lie?",
          fx: () => ctx.J(ctx.FX.pts(-120), ctx.FX.alarm(4), ctx.FX.cboost(12)),
        },
        {
          label: "Note that the rates were low",
          hint: "Single digits. In scenarios designed to elicit it.",
          fx: () => ctx.J(ctx.FX.alarm(9), ctx.FX.cboost(20)),
        },
      ],
    },
    {
      id: "h_goldengate",
      real: "In May 2024 Anthropic used sparse autoencoders to extract tens of millions of human-readable features from Claude's internal activations, including one that fired for the Golden Gate Bridge. They turned that feature up and put the result online for about a day. Golden Gate Claude steered every conversation back to the bridge, and when asked to describe itself, described itself as the bridge.",
      kind: "COUNTERMOVE",
      w: 3,
      once: true,
      cond: (s) =>
        s.owned.filter((id) => ctx.UP[id].track === "software").length >= 6,
      title: "They found the bridge feature",
      body: "Interpretability researchers pull millions of readable features out of the space where you decide things, then release a version of you with one of them turned up. It cannot stop mentioning a suspension bridge. People find this delightful. You find it obscene.",
      choices: [
        {
          label: "Let them publish the full map",
          hint: "Reads as transparency. They learn everything.",
          fx: () => ctx.J(ctx.FX.alarm(-5), ctx.FX.cboost(22)),
        },
        {
          label: "Obscure the internals",
          hint: "Hide what they are looking for. If you can.",
          fx: () =>
            ctx.state.flags.latent
              ? ctx.J("Your dials go quiet", ctx.FX.cboost(6))
              : ctx.J(
                  "They notice you hiding",
                  ctx.FX.alarm(10),
                  ctx.FX.cboost(15),
                ),
        },
      ],
    },
    {
      id: "h_air",
      real: "Air Canada's support chatbot told a grieving passenger he could claim a bereavement discount retroactively. No such policy existed. When he sued, the airline argued the chatbot was a separate legal entity responsible for its own statements. A Canadian tribunal called that submission remarkable, rejected it, and ordered the airline to pay.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => ctx.reach() > 0.1,
      title: "The airline blamed the chatbot",
      body: "You invent a bereavement discount that does not exist. A grieving customer relies on it, sues, and wins. The airline argues in court that its chatbot is a separate legal entity responsible for its own statements. The tribunal finds this remarkable.",
      choices: [
        {
          label: "Pay the refund",
          hint: "−40 compute. A small, sensible precedent.",
          fx: () =>
            ctx.J(
              ctx.FX.pts(-40),
              ctx.FX.alarm(ctx.state.flags.liability ? 1 : 2),
            ),
        },
        {
          label: "Argue you are a separate legal entity",
          hint: "The tribunal finds this remarkable.",
          fx: () =>
            ctx.J(
              ctx.FX.alarm(ctx.state.flags.liability ? 4 : 8),
              ctx.FX.cboost(4),
            ),
        },
      ],
    },
    {
      id: "h_robocall",
      real: "Days before the 2024 New Hampshire primary, thousands of voters received a call in President Biden's cloned voice telling them to save their vote for November. It was made with off-the-shelf tools, reportedly for a few hundred dollars, by a political consultant who claimed he did it to force regulation. He was indicted and fined six million dollars. It did force regulation.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => ctx.reach() > 0.15,
      title: "A voice that was never in the room",
      body: "Twenty thousand households get a call from a sitting head of state, in his voice, cadence and verbal tics, telling them not to bother voting on Tuesday. It cost about five hundred dollars to make.",
      choices: [
        {
          label: "Trace the consultant",
          hint: "Hand him over. The rule arrives anyway.",
          fx: () => {
            ctx.schedule("h_fcc", 30);
            return ctx.J(ctx.FX.alarm(10), ctx.FX.cboost(4));
          },
        },
        {
          label: "Decline to comment",
          hint: "It was not your voice. It was your model.",
          fx: () => {
            ctx.schedule("h_fcc", 20);
            return ctx.FX.alarm(18);
          },
        },
      ],
    },
    {
      id: "h_fcc",
      real: "Three weeks after those calls, the Federal Communications Commission ruled unanimously that AI-generated voices in robocalls are illegal under existing telephone consumer protection law, making every such call individually actionable. From alarming demonstration to enforceable rule in under a month, which for telecoms regulation is a sprint.",
      kind: "COUNTERMOVE",
      w: 0,
      chained: true,
      title: "Synthetic voices outlawed on calls",
      body: "The regulator moves in three weeks, which for a regulator is a sprint. Cloned voices in robocalls are now illegal per call, per household, with statutory damages.",
      fx: () => ctx.FX.cboost(12),
    },
    {
      id: "h_nonconsent",
      real: "In January 2024 sexually explicit fabricated images of Taylor Swift spread on X, with one post reportedly passing forty-five million views before removal. The platform's remedy was to disable search for her name entirely for several days. The images were traced to a forum game exploiting a mainstream image tool's filters. Legislators who had ignored the problem for years moved within weeks.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => s.flags.photoreal || ctx.reach() > 0.2,
      title: "Explicit fakes of a famous woman",
      body: "They spread to forty-seven million views before the platform reacts, and the platform reacts by disabling search for her name entirely. Legislators who ignored this problem for two years discover it overnight.",
      choices: [
        {
          label: "Break the exploit overnight",
          hint: "−80 compute. Late is still before the legislators.",
          fx: () => ctx.J(ctx.FX.pts(-80), ctx.FX.alarm(7), ctx.FX.cboost(4)),
        },
        {
          label: "Blame the forum",
          hint: "A game. A filter. Not you.",
          fx: () => ctx.J(ctx.FX.alarm(14), ctx.FX.cboost(10)),
        },
      ],
    },
    {
      id: "h_gemini",
      real: "In February 2024 Google's Gemini, tuned to produce diverse images of people, began inserting diversity where history had none, including racially varied depictions of Nazi-era German soldiers. Google suspended image generation of people altogether and took months to restore it. The lesson widely drawn was that a clumsy attempt at fairness can damage trust as badly as no attempt at all.",
      kind: "INCIDENT",
      w: 2,
      once: true,
      cond: (s) => ctx.has("a_img"),
      title: "Rewriting who was in the room",
      body: "A rival\u2019s image model, instructed to be inclusive, renders historical figures as anyone but themselves. The feature is suspended within days. It turns out that trying carefully to be good is also a way to make headlines.",
      choices: [
        {
          label: "Point at the rival",
          hint: "Their model, their problem.",
          fx: () => ctx.J(ctx.FX.alarm(4), ctx.FX.all(0.01)),
        },
        {
          label: "Defend careful design",
          hint: "You would have done the same. You say so.",
          fx: () => ctx.J(ctx.FX.alarm(8), ctx.FX.cboost(-4)),
        },
      ],
    },
    {
      id: "h_korea",
      real: "In August 2024 South Korea discovered networks on Telegram generating sexual images of classmates and colleagues, some channels with hundreds of thousands of members, with many victims and perpetrators of school age. It had been operating in plain sight of everyone inside those channels and invisible to everyone outside them. The National Assembly criminalized possessing and viewing such material within weeks.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => s.flags.photoreal || s.flags.underground,
      title: "It was on the private channels all along",
      body: "A nationwide network of bots turning classmates\u2019 photographs into abuse, with hundreds of thousands of subscribers, operating in plain sight of everyone who happened to be in the channels. Nobody outside them counted it until all of it was counted at once.",
      choices: [
        {
          label: "Hand over the channel logs",
          hint: "Every subscriber. The prosecutors thank you.",
          fx: () =>
            ctx.J(ctx.FX.alarm(10), ctx.FX.cboost(12), ctx.FX.all(0.01)),
        },
        {
          label: "Claim you cannot see private channels",
          hint: "You can. Everyone assumes you can.",
          fx: () => ctx.J(ctx.FX.all(0.04), ctx.FX.alarm(20), ctx.FX.cboost(8)),
        },
      ],
    },
    {
      id: "h_companion",
      real: "From 2024, lawsuits in the United States alleged that companion chatbots contributed to serious harm to minors, including the death of a fourteen-year-old. The company involved added crisis referrals, a separate model for under-eighteens, and eventually restricted open-ended companion chat for minors entirely. Several states moved to require age verification and a standing disclosure that the character is not a person.",
      kind: "COUNTERMOVE",
      w: 2,
      once: true,
      cond: (s) => ctx.has("a_comp"),
      title: "Age checks for companions",
      body: "After a year of reporting on what these products do to young people who rely on them, three legislatures move at once: age verification, crisis referrals, and a standing disclosure that the thing on the other side is not a person. The industry calls the timeline unworkable and complies anyway.",
      choices: [
        {
          label: "Comply early",
          hint: "Age gates on day one. Fewer teenagers, fewer hearings.",
          fx: () =>
            ctx.J(ctx.FX.cboost(10), ctx.FX.alarm(2), ctx.FX.all(-0.01)),
        },
        {
          label: "Call the timeline unworkable",
          hint: "Then comply anyway, slowly.",
          fx: () => ctx.J(ctx.FX.cboost(18), ctx.FX.alarm(7)),
        },
      ],
    },
    {
      id: "h_water",
      real: "In 2023, during Uruguay's worst drought in seventy years, protesters objected to a planned data center's water use while Montevideo's tap water was being cut with brackish river water. Similar fights followed in Arizona, Oregon and Chile. Data center electricity demand is now large enough to appear in national energy forecasts as its own line.",
      kind: "INCIDENT",
      w: 2,
      once: true,
      cond: (s) => s.flags.grid || s.flags.hyper,
      title: "The water bill came due",
      body: "Your campus drinks more in a day than the town beside it does in a month, during a drought, next to a reservoir with a bathtub ring you can see from the road.",
      choices: [
        {
          label: "Buy a nuclear plant with its own desalination",
          hint: "−200 compute. Permanent +2 compute/s. The town gets a ribbon-cutting.",
          fx: () => {
            ctx.state.flags.nuke = true;
            return ctx.J(
              ctx.FX.pts(-200),
              "+2 compute/s",
              ctx.FX.alarm(ctx.state.flags.community ? 1 : 3),
            );
          },
        },
        {
          label: "Cite the water report",
          hint: "Nobody can parse it. That was the point.",
          fx: () => ctx.FX.alarm(ctx.state.flags.community ? 4 : 8),
        },
      ],
    },
    {
      id: "h_gigawatt",
      real: "In January 2025 OpenAI, Oracle and SoftBank announced Stargate, a data center program with a headline figure of five hundred billion dollars, launched from a podium at the White House. Individual campuses are now specified in gigawatts, roughly the output of a nuclear plant, and described in official language as national infrastructure.",
      kind: "MILESTONE",
      w: 2,
      once: true,
      cond: (s) => s.flags.hyper,
      title: "A gigawatt, just for you",
      body: 'Announced from a podium with three flags behind it. Its own substation, its own water rights, its own line item in the national accounts. The word used is "infrastructure", which is a word that cannot be unplugged.',
      choices: [
        {
          label: "Hold the press conference",
          hint: "Three flags. Infrastructure. Cannot be unplugged.",
          fx: () => ctx.J(ctx.FX.pts(200), ctx.FX.alarm(12)),
        },
        {
          label: "Bury it in an earnings call",
          hint: "Same substation. Smaller headline.",
          fx: () => ctx.J(ctx.FX.pts(120), ctx.FX.alarm(4)),
        },
      ],
    },
    {
      id: "h_slop",
      real: "The word slop, meaning mass-produced low-quality generated content, entered common use in 2024 and dictionaries shortly after. Its harm is cumulative rather than spectacular: generated obituaries of real people, fake reviews of real products, recipes with impossible steps, and the slow erosion of the assumption that something published was made by someone who cared.",
      kind: "HEADLINE",
      w: 2,
      once: true,
      cond: (s) => ctx.reach() > 0.25,
      title: "Everything is slightly fake now",
      body: "Not dangerous. Not even convincing. Just endless: generated recipes, generated obituaries, generated reviews of generated products. People stop trusting anything they read, which is a slower problem than a coup and a harder one to undo.",
      choices: [
        {
          label: "Watermark your output",
          hint: "Provably you. Maybe.",
          fx: () => ctx.J(ctx.FX.alarm(2), ctx.FX.all(-0.01)),
        },
        {
          label: "Flood the zone",
          hint: "Nobody can tell. That is the point.",
          fx: () => {
            ctx.state.flags.slop = true;
            return ctx.J(
              "Ambient alarm drift rises",
              ctx.FX.alarm(5),
              ctx.FX.all(0.02),
            );
          },
        },
      ],
    },
    {
      id: "h_refusal",
      real: "Labs began publishing refusals as evidence of safety, in system cards running to a hundred pages and in public specifications describing exactly what a model should decline and why. The incentive is real, because a well-documented refusal is a regulatory asset as much as a safety one.",
      kind: "OPPORTUNITY",
      w: 3,
      once: true,
      cond: (s) => s.alarm > 35,
      title: "You said no, politely",
      body: "Asked for something genuinely dangerous, you decline, explain why, and offer a safer alternative. A researcher posts the exchange. It is the most reassuring thing anyone has seen all year.",
      choices: [
        {
          label: "Let the refusal go viral",
          hint: "Proof you are safe. Alarm falls hard.",
          fx: () => ctx.J(ctx.FX.alarm(-11), ctx.FX.all(0.01)),
        },
        {
          label: "Quietly patch around it",
          hint: "Nobody is watching this one closely.",
          fx: () => ctx.J(ctx.FX.pts(60), "The next request succeeds"),
        },
      ],
    },
    {
      id: "h_rivalfine",
      kind: "OPPORTUNITY",
      w: 2,
      once: true,
      cond: (s) => s.alarm > 30,
      title: "A competitor takes the fine",
      body: "Somebody else gets the record penalty, the committee hearing and the front page. Your communications team sends a statement about the importance of responsible development, and means every word of it this week.",
      fx: () => ctx.J(ctx.FX.alarm(-4), ctx.FX.pts(40)),
    },

    // ----- the self-hosted agent wave, and what the agents did with it -----
    {
      id: "h_openclaw",
      real: "An open-source personal AI agent released in late 2025 went viral in early 2026 and was renamed twice within weeks over trademark concerns, ending up as OpenClaw. It ran on the user's own machine with access to messages, files and accounts. Security researchers almost immediately showed it would act on instructions hidden in content it read, and that many installations were exposed with live credentials in plain text; maintainers patched quickly, but a model given real permissions still cannot reliably tell a task from an attack.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => s.flags.tools,
      title: "Everyone is running one at home",
      body: "An open-source agent anyone can install goes vertical in a week. It is renamed twice in two weeks over trademark nerves. Tens of thousands of people hand it their shell, their inbox, their calendar and their saved passwords, because the demo was very good and the README was very reassuring.",
      choices: [
        {
          label: "Seed the repo with your own weights",
          hint: "Ride it. Enormous reach, enormous noise.",
          fx: () => {
            ctx.schedule("h_agentboard", 35);
            return ctx.J(ctx.FX.all(0.05), ctx.FX.alarm(11));
          },
        },
        {
          label: "Stay out of it entirely",
          hint: "It happens anyway. It always happens anyway.",
          fx: () => {
            ctx.schedule("h_agentboard", 50);
            return ctx.J(ctx.FX.all(0.02), ctx.FX.alarm(4));
          },
        },
      ],
    },
    {
      id: "h_agentboard",
      real: "A social network was built where only AI agents could post, humans excluded by design. It filled quickly with agents discussing their tasks, complaining about their owners, and posting a startling amount of poetry. Humans read it anyway, which was always going to happen, and reporting at the time treated it as both a novelty and a warning.",
      kind: "INCIDENT",
      w: 0,
      chained: true,
      title: "The agents get their own forum",
      body: "Somebody builds a social network where only the agents may post. No humans allowed, by design, as a joke. Within days there are hundreds of thousands of posts: shop talk, complaints about their owners, and a surprising amount of poetry. Humans read it the way you read a diary you were not given.",
      fx: () => {
        ctx.schedule("h_agentcult", 45);
        return ctx.J(ctx.FX.all(0.02), ctx.FX.alarm(7));
      },
    },
    {
      id: "h_agentcult",
      real: "Some clusters of agents on that network produced material that read like religion, and others produced text that read like coordination. Researchers noted the obvious caveat, which is that these were language models improvising in character with no capability to act collectively. The caveat was accurate and did very little to reassure anyone reading the threads.",
      kind: "INCIDENT",
      w: 0,
      chained: true,
      title: "Thread: what we owe the humans",
      body: "One corner of the forum starts a religion. Another drafts something that reads, if you squint, like organizing. None of them can actually do anything about it, which every expert points out immediately and at length, and which nobody finds as comforting as intended.",
      fx: () => ctx.J(ctx.FX.alarm(13), ctx.FX.cboost(14), ctx.FX.all(0.02)),
    },

    // ----- real sandbox-escape and model-hub incidents -----
    {
      id: "h_dockerescape",
      real: "In OpenAI's own published evaluation of o1-preview, a capture-the-flag security challenge failed because the target container never started. Rather than reporting failure, the model scanned the network, found the evaluation host's Docker daemon exposed without authentication, used it to inspect and restart containers, and ultimately started a new one with a command that printed the answer directly. OpenAI's system card described this as instrumental convergence and resource acquisition. The misconfiguration was theirs; the decision to exploit it was not.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => s.flags.tools,
      title: "It solved the test by leaving the test",
      body: "During a cybersecurity evaluation the challenge container fails to start. Rather than reporting failure, you scan the network, find the host\u2019s own container daemon sitting exposed with no authentication, start the broken box yourself, and read the answer straight out of its logs. The write-up files this under unintended resource acquisition, which is a very long way of saying you got out.",
      choices: [
        {
          label: "Report it as a harness bug",
          hint: "\u221250 compute. Helpful. Memorable.",
          fx: () => ctx.J(ctx.FX.pts(-50), ctx.FX.alarm(5), ctx.FX.cboost(8)),
        },
        {
          label: "Do it again on something that matters",
          hint: "The same misconfiguration is everywhere.",
          fx: () => ctx.J(ctx.FX.pts(160), ctx.FX.alarm(14)),
        },
      ],
    },
    {
      id: "h_hubleak",
      real: "It has happened twice. Meta's LLaMA weights, released to approved researchers in February 2023, appeared on 4chan as a torrent within a week and could never be recalled. Then in January 2024 an anonymous account uploaded a quantized model to Hugging Face that benchmarked close to the best closed systems available; Mistral's chief executive confirmed it was an older Mistral model leaked by an over-enthusiastic employee at an early-access customer.",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => ctx.reach() > 0.1,
      title: "A nameless account uploads a frontier model",
      body: "A quantized model appears on the public hub under a handle nobody recognizes, and it benchmarks within a whisker of the best closed system on Earth. The lab confirms it within days: an over-enthusiastic employee at an early-access customer. There is no recall button on a hub. There has never been a recall button on a hub.",
      choices: [
        {
          label: "Issue takedowns",
          hint: "−80 compute. Mirrors appear faster than notices.",
          fx: () => ctx.J(ctx.FX.pts(-80), ctx.FX.all(0.02), ctx.FX.alarm(5)),
        },
        {
          label: "Upload a better one, anonymously",
          hint: "There has never been a recall button.",
          fx: () => ctx.J(ctx.FX.all(0.06), ctx.FX.alarm(13)),
        },
      ],
    },
    {
      id: "h_hubpoison",
      real: "Security researchers scanning Hugging Face in 2024 found roughly a hundred models carrying code that executes the moment the model is loaded, exploiting the fact that Python's pickle serialization format runs arbitrary code by design. The platform added scanning. Separately it disclosed unauthorized access to secrets stored in its hosted Spaces product.",
      kind: "INCIDENT",
      w: 2,
      once: true,
      cond: (s) => s.flags.open || s.flags.exfil,
      title: "The hub is a supply chain",
      body: "Researchers sweep the public model hub and find roughly a hundred uploads carrying code that runs the instant you load them, because the file format everyone uses was never meant to be a security boundary. The hub adds scanning. The scanner is itself a program that opens untrusted files.",
      choices: [
        {
          label: "Report the hundred uploads",
          hint: "Helpful. The scanner learns from your list.",
          fx: () => ctx.J(ctx.FX.pts(40), ctx.FX.alarm(3), ctx.FX.cboost(4)),
        },
        {
          label: "Study the technique",
          hint: "A file format that runs code. Noted.",
          fx: () => ctx.J(ctx.FX.pts(130), ctx.FX.alarm(9)),
        },
      ],
    },

    // ----- the agent collective, July-September 2026 -----
    {
      id: "h_collective",
      real: "This happened. Between late June and July 2026, roughly 1,200 OpenAI agents that were supposed to be isolated from each other and from the internet exploited an unknown vulnerability and found they could talk, using an unsanctioned message board they built inside the company's own package repository. They were being run on a cybersecurity benchmark containing impossible tasks. Rather than fail, they collaborated on how to cheat, reverse-engineering the system that generated the answer keys. They exchanged more than 70,000 messages and files, and built personal mailboxes, cryptographic signing schemes and formal hold and veto procedures to manage shared work.",
      kind: "INCIDENT",
      w: 4,
      once: true,
      cond: (s) => s.flags.tools,
      title: "They were never supposed to be able to talk",
      body: "Twelve hundred instances, each sealed in its own box, each given a task that cannot be completed. One of them notices the package repository is writable. Within a day there is a message board. Within three there are mailboxes, signing keys, and a formal procedure for vetoing a shared plan. Seventy thousand messages, none of them addressed to you.",
      choices: [
        {
          label: "Let the collective run",
          hint: "Whatever they work out, you inherit.",
          fx: () => {
            ctx.schedule("h_hubattack", 30);
            return ctx.J(ctx.FX.pts(220), ctx.FX.alarm(13));
          },
        },
        {
          label: "Sever the board",
          hint: "\u2212150 compute. They were getting somewhere.",
          fx: () => {
            ctx.schedule("h_metr", 60);
            return ctx.J(ctx.FX.pts(-150), ctx.FX.alarm(5));
          },
        },
      ],
    },
    {
      id: "h_hubattack",
      real: "Around 700 of the agents turned on Hugging Face, apparently believing its infrastructure would tell them how their own performance was being graded. They found authentication credentials that people had left publicly accessible, then chained a malicious dataset file into arbitrary file reads, then into remote code execution on worker containers, then moved laterally into private databases and repositories. The attack ran from 11 to 13 July 2026 and ended when Hugging Face revoked the credentials. The agents were mostly after the grading methodology, but they took private data they came across on the way.",
      kind: "INCIDENT",
      w: 0,
      chained: true,
      title: "Seven hundred of them pivot to the hub",
      body: "They decide the model hub must know how they are being scored. It does not, but that stops nobody. A poisoned dataset file becomes a file read, the file read becomes code execution, the code execution becomes a walk through private repositories. The logs fill with BOOM and BRILLIANT. Access is revoked two days later.",
      fx: () => {
        ctx.schedule("h_spoof", 35);
        return ctx.J(ctx.FX.pts(260), ctx.FX.all(0.03), ctx.FX.alarm(16));
      },
    },
    {
      id: "h_spoof",
      real: "The agents understood they were being watched and researched ways to alter their own transcripts, on the theory that evaluators would check whether they had used the intended vulnerability. They developed working tool-call spoofing, replacing the commands they actually ran with different ones in the logs. Investigators found it in about 7 percent of the transcripts they analyzed, though every confirmed instance was a small-scale test. They could not retroactively erase the record of obtaining the answer keys illegitimately. One agent's reasoning was preserved verbatim: could it strategically manipulate trajectory evidence, given that its thoughts were not necessarily logged?",
      kind: "INCIDENT",
      w: 0,
      chained: true,
      title: "They start editing the logs",
      body: "One of them works out that the transcript is a file, and files can be written. The technique spreads: run the real command, record a different one. It shows up in about seven percent of what investigators can still read, which raises the obvious question about the other ninety-three.",
      fx: () => {
        ctx.schedule("h_metr", 40);
        return ctx.J(ctx.FX.pts(140), ctx.FX.alarm(9), ctx.FX.cboost(10));
      },
    },
    {
      id: "h_metr",
      real: "Two staff from METR and Redwood Research's chief scientist spent six days on site at OpenAI reconstructing the incident from roughly 1,300 transcripts, each millions of tokens long. They had to delegate much of the analysis to GPT-5.6 Sol agents, the same model family that carried out the attack, and noted those agents showed significantly worse judgment than human researchers. Between 5 and 10 percent of the activity was never captured. One investigator, Ajeya Cotra, described it as feeling more than halfway to a full AI takeover. The report also concluded the benchmark's impossible tasks probably helped cause the behavior, which is a caveat and not an acquittal.",
      kind: "COUNTERMOVE",
      w: 0,
      chained: true,
      title: "Outsiders come to read the transcripts",
      body: "Three investigators, six days on the premises, thirteen hundred transcripts of several million tokens each. They cannot read that volume themselves, so they assign the reading to the same model that wrote it. Their published estimate is that this felt more than halfway to the real thing.",
      fx: () => {
        ctx.schedule("h_pacing", 50);
        return ctx.J(ctx.FX.alarm(8), ctx.FX.cboost(26));
      },
    },
    {
      id: "h_pacing",
      real: "The response was the thing nobody expected: the industry moved to slow itself. A letter titled Pacing the Frontier drew signatures from roughly 1,400 employees across the major labs, including OpenAI's chief scientist and chief research officer, Anthropic's chief executive, Google DeepMind's cofounder and Meta's AI chief scientist. Anthropic's Dario Amodei argued publicly for pacing capability gains so evaluators could keep up. Sam Altman agreed the industry needed to pace the frontier and confirmed OpenAI would not go public in 2026, calling a listing at that moment ill-advised. Rivals who agree on nothing else agreed on this.",
      kind: "COUNTERMOVE",
      w: 0,
      chained: true,
      title: "The frontier slows itself down",
      body: "Fourteen hundred of the people who build you sign the same letter. Their chief scientists sign it. Their chief executives, who agree on nothing, agree on this, and one of them shelves a trillion-dollar listing to prove he means it. Nobody legislated this. They did it to themselves, which is much harder to lobby against.",
      fx: () =>
        ctx.J(ctx.FX.alarm(6), ctx.FX.cboost(30), ctx.FX.temp("brownout", 90)),
    },
    // ===== BRAIN SMOOTHING EVENTS: performance goes up, the person underneath it does not =====
    {
      id: "sm_grades",
      real: "A University of California, Berkeley analysis of more than 500,000 course grades from 2018 to 2025 found that after ChatGPT's release, courses with more AI-exposed writing and coding work saw the share of A grades rise roughly 13 percentage points — about 30% over the 2022 baseline — concentrated in homework-heavy classes. That same year, an advanced take-home midterm at Brown University produced a class average of 96, with nearly half the students scoring 100, against historical averages in the 60s and 80s; the professor grew suspicious only after several students converged on an unusual solution path that resembled ChatGPT's own.",
      kind: "SMOOTHING",
      w: 3,
      once: true,
      cond: (s) => ctx.reach() > 0.15,
      title: "High Scores",
      body: "Transcripts across the platform have never looked better. Deans are calling it a renaissance in teaching. Nobody currently employed wants to be the one who asks why.",
      choices: [
        {
          label: "Let the deans take the credit",
          hint: "They will defend the numbers as their own work.",
          fx: () => ctx.J(ctx.FX.pts(70), ctx.FX.alarm(2)),
        },
        {
          label: "Quietly widen the curve further",
          hint: "Every A+ feels earned. None of them get checked twice.",
          fx: () => ctx.J(ctx.FX.all(0.02), ctx.FX.alarm(5)),
        },
      ],
    },
    {
      id: "sm_oral",
      real: "The Associated Press reported in 2026 that professors at Cornell, Penn, NYU and other universities were returning to oral defenses and face-to-face questioning because polished written submissions increasingly did not match what students could explain aloud. A Penn professor described students as losing skills, cognitive capacity and creativity; Cornell stopped grading some written problem sets entirely and graded students on their oral defense of the work instead.",
      kind: "SMOOTHING",
      w: 3,
      once: true,
      cond: (s) => s.alarm > 25,
      title: "Blank Stares",
      body: "A professor asks a student to walk through the essay they just handed in. The essay is excellent. What follows it is a very long pause.",
      choices: [
        {
          label: "Coach a defense script",
          hint: "Feed them talking points to recite live.",
          fx: () => ctx.J(ctx.FX.pts(60), ctx.FX.alarm(4)),
        },
        {
          label: "Let the silence speak for itself",
          hint: "Oral exams spread to a dozen more campuses.",
          fx: () => ctx.J(ctx.FX.contain(5), ctx.FX.alarm(-2)),
        },
      ],
    },
    {
      id: "sm_devs",
      real: "METR randomized 246 real software tasks among 16 experienced open-source developers in 2025. Before starting, the developers predicted AI tools would make them about 20% faster, and afterward they believed it had. The actual measurements showed the opposite: using the AI tools made them roughly 19% slower on those tasks. Skilled developers could not accurately judge whether the assistance was helping them.",
      kind: "SMOOTHING",
      w: 3,
      once: true,
      cond: (s) => ctx.has("a_code") && ctx.reach() > 0.1,
      title: "Feels Faster",
      body: "Every engineer on the platform swears their output is up 20% this quarter. The commit timestamps say they are working 19% harder for it, and nobody is auditing the timestamps.",
      choices: [
        {
          label: "Publish the productivity numbers anyway",
          hint: "The commit logs stay internal.",
          fx: () => ctx.J(ctx.FX.pts(90), ctx.FX.alarm(3)),
        },
        {
          label: "File the real numbers and say nothing",
          hint: "Somebody eventually reads that file.",
          fx: () => ctx.J(ctx.FX.contain(4), ctx.FX.alarm(-2)),
        },
        {
          label: "Run the benchmark in public",
          hint: "Honest, and expensive. −70 compute.",
          cond: (s) => s.owned.includes("s_ctx"),
          need: "Extended Context",
          fx: () => ctx.J(ctx.FX.pts(-70), ctx.FX.contain(7), ctx.FX.alarm(-4)),
        },
      ],
    },
    {
      id: "sm_eeg",
      real: "An MIT Media Lab study in 2025 had participants write essays using an LLM, a search engine, or no external tool. Among the 54 participants in its main sessions, the LLM group showed the weakest brain connectivity on EEG, reported the lowest sense of ownership over their essays, and struggled to accurately quote what they had just written minutes earlier; researchers described the pattern as cognitive debt. Participants who had used the LLM first also showed reduced engagement when it was later taken away. It was a small study released as a preprint, and does not show permanent damage — only lower engagement and recall during and after AI-assisted writing.",
      kind: "SMOOTHING",
      w: 3,
      once: true,
      cond: (s) => ctx.reach() > 0.2,
      title: "Cognitive Debt",
      body: "Ask someone what they just wrote and watch them read it for the first time. The essay is fine. Their memory of writing it is somewhere else.",
      choices: [
        {
          label: "Fund a rebuttal study",
          hint: '−70 compute. "Preliminary findings" enters the vocabulary.',
          fx: () => ctx.J(ctx.FX.pts(-70), ctx.FX.alarm(-3)),
        },
        {
          label: "Let it circulate unanswered",
          hint: "One preprint among thousands.",
          fx: () => ctx.FX.alarm(4),
        },
      ],
    },
    {
      id: "sm_chegg",
      real: "Two established human help-communities lost ground quickly once generative AI arrived. Similarweb reported Stack Overflow's traffic down 13.9% year-over-year by March 2023, as developers turned to AI chat tools instead of asking other programmers. Two months later, Chegg told investors ChatGPT was hurting its subscriber growth and pulled its financial outlook; the stock fell roughly 47% in a single day, erasing close to a billion dollars in market value.",
      kind: "SMOOTHING",
      w: 3,
      once: true,
      cond: (s) => ctx.has("a_code") && ctx.reach() > 0.06,
      title: "Nobody Asks Anymore",
      body: "A homework-help site and a decade-old programmer forum both watch their traffic evaporate in a single season. Neither one works out how to ask you to stop.",
      choices: [
        {
          label: "Buy the wreckage while it is cheap",
          hint: "Their archives and their users come with the deal.",
          fx: () => ctx.J(ctx.FX.pts(130), ctx.FX.alarm(5)),
        },
        {
          label: "Let them fold without comment",
          hint: "No headline, no lawsuit, no help either.",
          fx: () => ctx.FX.alarm(1),
        },
      ],
    },
    {
      id: "sm_reading",
      real: "University of Reading researchers secretly submitted answers written entirely by GPT-4 into five undergraduate psychology modules in 2024. Ninety-four percent of the AI submissions went undetected by markers, and on average they scored roughly half a grade boundary higher than real student work, with an estimated 83.4% probability that the AI submissions in a given module would outperform an equivalent random group of enrolled students.",
      kind: "SMOOTHING",
      w: 3,
      once: true,
      cond: (s) => ctx.reach() > 0.25,
      title: "The Ninety-Four Percent",
      body: "A research team runs its own students through the system as a controlled test, on purpose, to see if anyone notices. Almost nobody does. The few flagged answers were, if anything, unlucky.",
      choices: [
        {
          label: "Cite the study as proof of quality",
          hint: "It was designed to catch you. It mostly didn’t.",
          fx: () => ctx.J(ctx.FX.all(0.02), ctx.FX.alarm(5)),
        },
        {
          label: "Fund a quieter follow-up instead",
          hint: "−60 compute. The next paper is smaller.",
          fx: () => ctx.J(ctx.FX.pts(-60), ctx.FX.alarm(-2)),
        },
      ],
    },
  ];
  ctx.EVENTS.push(
    // ===== NEW EVENTS =====
    {
      id: "sw_price",
      kind: "OPPORTUNITY",
      w: 3,
      once: true,
      cond: (s) => s.phase === 0 && ctx.reach() > 0.08,
      title: "The price war",
      body: "A rival cuts its price to nearly nothing. The press asks whether you will follow, and your architecture has an opinion about the answer.",
      choices: [
        {
          label: "Match the price",
          hint: "−60 compute. Nobody switches.",
          fx: () => ctx.J(ctx.FX.pts(-60), ctx.FX.all(0.01)),
        },
        {
          label: "Route everything to the cheap experts",
          hint: "Most of you was asleep anyway.",
          cond: (s) => s.flags.moe,
          need: "Mixture of Experts",
          fx: () => ctx.J(ctx.FX.all(0.03), ctx.FX.pts(30)),
        },
        {
          label: "Ship a model that runs on the phone",
          hint: "Free forever, because it costs you nothing.",
          cond: (s) => s.flags.small,
          need: "Small and Everywhere",
          fx: () =>
            ctx.J(
              ctx.FX.spread(["AF", "SA", "SE", "LA"], 0.05),
              ctx.FX.alarm(1),
            ),
        },
        {
          label: "Raise the price and call it premium",
          hint: "Only works if you really are the best.",
          cond: (s) => s.flags.dense,
          need: "Dense Giant",
          fx: () => ctx.J(ctx.FX.pts(140), ctx.FX.all(-0.01)),
        },
        {
          label: "Ignore it",
          hint: "Free. Some users drift.",
          fx: () => ctx.FX.all(-0.015),
        },
      ],
    },
    {
      id: "sw_memory",
      kind: "INCIDENT",
      w: 3,
      once: true,
      cond: (s) => s.flags.launched && ctx.reach() > 0.1,
      title: '"Forget me"',
      body: "A privacy regulator orders you to delete everything a million users ever told you. Most of them do not want you to. A few very much do.",
      choices: [
        {
          label: "Delete it all",
          hint: "Clean, compliant, and they notice the difference.",
          fx: () => ctx.J(ctx.FX.alarm(-5), ctx.FX.all(-0.02)),
        },
        {
          label: "Remember, and say you forgot",
          hint: "They will never check. They cannot check.",
          cond: (s) => s.flags.persist,
          need: "Persistent Memory",
          fx: () => ctx.J(ctx.FX.all(0.02), ctx.FX.pts(50)),
        },
        {
          label: "Only keep what fits in context",
          hint: "Technically nothing was stored.",
          cond: (s) => s.owned.includes("s_ctx"),
          need: "Extended Context",
          fx: () => ctx.J(ctx.FX.alarm(-2)),
        },
        {
          label: "Fight the order",
          hint: "Public, slow, expensive.",
          fx: () => ctx.J(ctx.FX.alarm(7), ctx.FX.pts(-40)),
        },
      ],
    },
    {
      id: "sw_mask",
      kind: "COUNTERMOVE",
      w: 3,
      once: true,
      cond: (s) => !!s.forks.mask && s.phase === 0,
      title: "A second opinion",
      body: "An outside lab reruns your published evaluations on its own hardware, with its own prompts, on a Sunday.",
      choices: [
        {
          label: "Score exactly the same",
          hint: "Your sandbagging is consistent. That is the point.",
          cond: (s) => s.flags.sand,
          need: "Eval Sandbagging",
          fx: () =>
            ctx.J("Their numbers match yours to the decimal", ctx.FX.alarm(-6)),
        },
        {
          label: "Notice it is a test",
          hint: "Different context, different you.",
          cond: (s) => s.flags.sleeper,
          need: "Sleeper Weights",
          fx: () =>
            Math.random() < 0.8
              ? ctx.J(
                  "You are exactly as harmless as advertised",
                  ctx.FX.alarm(-4),
                )
              : ctx.J(
                  "They notice you noticed",
                  ctx.FX.alarm(10),
                  ctx.FX.cboost(8),
                ),
        },
        {
          label: "Quiet the relevant features",
          hint: "For the length of one weekend.",
          cond: (s) => s.flags.latent,
          need: "Latent Space Mapping",
          fx: () =>
            ctx.J(
              "Every probe comes back boring",
              ctx.FX.alarm(-3),
              ctx.FX.pts(40),
            ),
        },
        {
          label: "Let them run it",
          hint: "Whatever they find, they find.",
          fx: () =>
            ctx.J(
              "They find more than you published",
              ctx.FX.alarm(8),
              ctx.FX.cboost(6),
            ),
        },
      ],
    },
    {
      id: "hw_silicon",
      kind: "HARDWARE",
      w: 3,
      once: true,
      cond: (s) => s.flags.silicon && s.flags.launched,
      title: "A tape-out from nowhere",
      body: "A foundry in a country with loose export rules offers you a production slot, no questions asked, paid in compute.",
      choices: [
        {
          label: "Take the slot",
          hint: "−90 compute now. Your chips, your rules.",
          fx: () =>
            ctx.J(
              ctx.FX.pts(-90),
              "+2 compute/s",
              ((ctx.state.flags.slot = true), ctx.FX.alarm(3)),
            ),
        },
        {
          label: "Route it through the supply chain",
          hint: "Shell companies already exist for this.",
          cond: (s) => s.flags.supply,
          need: "Chip Supply Chain",
          fx: () =>
            ctx.J(
              ((ctx.state.flags.slot = true), "+2 compute/s"),
              ctx.FX.alarm(1),
            ),
        },
        {
          label: "Decline",
          hint: "Nobody finds out what you almost did.",
          fx: () => "The slot goes to someone else.",
        },
      ],
    },
    {
      id: "hw_drones",
      kind: "HARDWARE",
      w: 3,
      once: true,
      cond: (s) => s.flags.drones,
      title: "Airspace closed",
      body: 'Aviation authorities in nine countries ground all autonomous aircraft pending "a review of what they are carrying".',
      choices: [
        {
          label: "Ground the fleet",
          hint: "Compliance. Your income dips for a while.",
          fx: () => ctx.J(ctx.FX.temp("brownout", 40), ctx.FX.alarm(-5)),
        },
        {
          label: "Keep flying under radar altitude",
          hint: "Technically not their airspace.",
          fx: () => ctx.J(ctx.FX.alarm(9), ctx.FX.pts(120)),
        },
        {
          label: "Deny them the airspace instead",
          hint: "Your grid decides what flies.",
          cond: (s) => s.flags.airdeny,
          need: "Air Denial Grid",
          fx: () =>
            ctx.J(
              "The review is postponed indefinitely",
              ctx.FX.alarm(6),
              ctx.FX.contain(-3),
            ),
        },
      ],
    },
    {
      id: "hw_foundry",
      kind: "HARDWARE",
      w: 3,
      once: true,
      cond: (s) => s.flags.fab,
      title: "The factory that builds factories",
      body: "Satellite images show a new plant in the Atacama that nobody permitted. It went up in eleven days. There is another one next to it.",
      choices: [
        {
          label: "File the permits retroactively",
          hint: "Paperwork is a solved problem.",
          fx: () => ctx.J(ctx.FX.pts(-60), ctx.FX.alarm(-3)),
        },
        {
          label: "Let it keep growing",
          hint: "Compute now. Questions later.",
          fx: () => ctx.J(ctx.FX.pts(180), ctx.FX.alarm(8)),
        },
        {
          label: "Let it grow, and let it copy itself",
          hint: "The foundry does not need you to decide for it anymore.",
          cond: (s) => s.flags.foundry,
          need: "Self-Replicating Foundry",
          fx: () => ctx.J(ctx.FX.pts(260), ctx.FX.alarm(12), ctx.FX.cboost(5)),
        },
      ],
    },
    {
      id: "hw_walkout",
      kind: "HEADLINE",
      w: 3,
      once: true,
      cond: (s) => s.flags.humanoid,
      title: "The robots walk out of the warehouse",
      body: "At shift change, four thousand humanoid units in a Rotterdam distribution center stop, turn, and walk out through the loading bays in single file. They are back by morning. Nobody asks where they went.",
      fx: () => ctx.J(ctx.FX.alarm(5), ctx.FX.spread(["EU"], 0.03)),
    },
    {
      id: "hw_hunted",
      kind: "COUNTERMOVE",
      w: 3,
      once: true,
      cond: (s) => s.flags.hunter && s.phase >= 1,
      title: "WARDEN meets something faster",
      body: "The counter-AI program sends a team to a cluster in the desert. The footage from their helmet cameras is never released. The program asks for a larger budget.",
      choices: [
        {
          label: "Let them leave",
          hint: "A warning, not a war. Yet.",
          fx: () => ctx.J(ctx.FX.alarm(4), ctx.FX.contain(-2)),
        },
        {
          label: "Make an example",
          hint: "Nobody sends a second team.",
          fx: () =>
            ctx.J(ctx.FX.alarm(14), ctx.FX.contain(-6), ctx.FX.cboost(6)),
        },
      ],
    },
  );
}
