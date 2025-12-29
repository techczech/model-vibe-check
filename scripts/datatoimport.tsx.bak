import React from 'react';
import { SectionData } from './types';
import { CodeBlock } from './components/CodeBlock';
import { InfoBlock } from './components/InfoBlock';
import { PlaceholderImage } from './components/PlaceholderImage';
import { FileAttachment } from './components/FileAttachment';
import { psmithText } from './psmithData';

export const contentData: SectionData[] = [
  {
    id: 'intro',
    title: 'Personal Evals',
    category: 'Introduction',
    keywords: 'introduction, dominik lukes, evaluation',
    searchContent: "Prompts to evaluate frontier capabilities of Large Language Models. I use a selection of these prompts to evaluate a new model on the limits of performance. Some of these prompts are only useful for testing smaller models because the frontier models always perform well. By Dominik Lukeš.",
    content: (
      <>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">
          Personal Evals: Prompts to develop a sense for the capabilities of Large Language Models
        </h1>
        <InfoBlock>
          <p className="font-semibold mb-2">Prompts to use to evaluate frontier capabilities of Large Language Models.</p>
          <p>I use a selection of these prompts to evaluate a new model on the limits of performance.</p>
          <p>Some of these prompts are only useful for testing smaller models because the frontier models always perform well.</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">By Dominik Lukeš. Updated 29 Mar 2025.</p>
        </InfoBlock>
      </>
    )
  },
  {
    id: 'spatial-recognition',
    title: 'Recognition of Vertical Text',
    category: 'Spatial Cognition',
    keywords: 'spatial, vertical, text recognition',
    searchContent: `All models fail at these tasks most of the time. 
T   t   i   s   m
h   e   t   e   e
i   x       c   s
s   t   o   r   s
        n   e   a
    h   e   t   g
    a           e
    s            

    i            
    n            

V t m s L
e e a e L
r x k n M
t t e s s
i   s e
c
a   n t
l   o o

I  t  e  d  t  t  t  l  g  m  L  M  t  t
f  h  n  i  h  e  h  o  e  o  a  o  o  h
   i  o  s  e  x  i  n  t  r  r  d     i
y  s  u  c  r  t  s  g  s  e  g  e  b  s
o     g  o  e     .  e        e  l  e  .
u  c  h  v     h     r  i  c            
   a     e  i  i  A     n  h  L  b  b   
l  r  y  r  s  d  s  a  c  a  a  u  e   
o  e  o        d     n  r  l  n  t  s   
o  f  u  t  a  e  i  d  e  l  g     t   
k  u     h  n  n  t     a  e  u  o      
   l  w  a           l  s  n  a  3  a   
a  l  i  t  a  i  g  o  i  g  g     t   
t  y  l     c  n  e  n  n  i  e  s      
      l     t     t  g  g  n     e      
            u     s  e  l  g     e      
            a        r  y        m      
            l              f     s      
                     i     o            
                     t     r            
                                        
                           a            
                           n            
                           y            `,
    content: (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Recognition of vertical text</h2>
        <p className="mb-4">All models fail at these tasks most of the time.</p>
        <CodeBlock code={`T   t   i   s   m
h   e   t   e   e
i   x       c   s
s   t   o   r   s
        n   e   a
    h   e   t   g
    a           e
    s            

    i            
    n            `} />
        
        <CodeBlock code={`V t m s L
e e a e L
r x k n M
t t e s s
i   s e
c
a   n t
l   o o`} />

        <CodeBlock code={`I  t  e  d  t  t  t  l  g  m  L  M  t  t
f  h  n  i  h  e  h  o  e  o  a  o  o  h
   i  o  s  e  x  i  n  t  r  r  d     i
y  s  u  c  r  t  s  g  s  e  g  e  b  s
o     g  o  e     .  e        e  l  e  .
u  c  h  v     h     r  i  c            
   a     e  i  i  A     n  h  L  b  b   
l  r  y  r  s  d  s  a  c  a  a  u  e   
o  e  o        d     n  r  l  n  t  s   
o  f  u  t  a  e  i  d  e  l  g     t   
k  u     h  n  n  t     a  e  u  o      
   l  w  a           l  s  n  a  3  a   
a  l  i  t  a  i  g  o  i  g  g     t   
t  y  l     c  n  e  n  n  i  e  s      
      l     t     t  g  g  n     e      
            u     s  e  l  g     e      
            a        r  y        m      
            l              f     s      
                     i     o            
                     t     r            
                                        
                           a            
                           n            
                           y            `} />
      </>
    )
  },
  {
    id: 'spatial-relationships',
    title: 'Spatial Relationships in Language',
    category: 'Spatial Cognition',
    keywords: 'spatial relationships, language context',
    searchContent: "This prompt asks the model to come up with contexts. Come up with contexts in which the sentence The cathedral is in front of the statue makes sense.",
    content: (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Reasoning about spatial relationships encoded in language</h2>
        <InfoBlock>
            This prompt asks the model to come up with contexts.
        </InfoBlock>
        <CodeBlock code={`Come up with contexts in which the sentence The cathedral is in front of the statue makes sense.`} />
      </>
    )
  },
  {
    id: 'visual-reasoning',
    title: 'Visual Reasoning',
    category: 'Spatial Cognition',
    keywords: 'svg, bicycle, visual',
    searchContent: "Make an SVG of a bicyle.",
    content: (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Visual reasoning</h2>
        <CodeBlock code={`Make an SVG of a bicyle.`} />
      </>
    )
  },
  {
    id: 'coding-capability',
    title: 'Coding Capability & Reasoning',
    category: 'Coding',
    keywords: 'readability, code, python, tool',
    searchContent: "This single prompt tests the models knowledge of readability formulas, its ability to implement them and output enough code to achieve this. This is also a good prompt to test coding agents. Claude 3.7 Sonnet performs best at this as a single shot with Gemini 2.5 a close second. Make a detailed, visually interesting readability analysis tool.",
    content: (
      <>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Prompts to test coding capability and reasoning</h1>
        <InfoBlock>
          This single prompt tests the models knowledge of readability formulas, its ability to implement them and output enough code to achieve this. This is also a good prompt to test coding agents. Claude 3.7 Sonnet performs best at this as a single shot with Gemini 2.5 a close second.
        </InfoBlock>
        <CodeBlock code={`Make a detailed, visually interesting readability analysis tool.`} />
      </>
    )
  },
  {
    id: 'metalanguage-anaphora',
    title: 'Metalanguage and Anaphora',
    category: 'Linguistics',
    keywords: 'pronouns, reference, linguistics',
    searchContent: `These two prompts test the ability to disambiguate anaphora. The first one is a single sentence and the second one expands.
Make a table of all the pronouns in this sentence matched to what noun they refer to: Natasha was afraid that her mother would be worried and that's why she didn't tell her about her accident.
Make a table of all the pronouns in this text matched to what noun they refer to (for possessive pronouns include the noun and for subject or objects include the predicate in the table to make it easier to read): 

Natasha was afraid that her mother would be worried and that's why she didn't tell her about her accident. Her reaction, after she eventually told her about it, convinced her she had been right to wait because she was inconsolable until she promised her she would never drive in the dark again.`,
    content: (
      <>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Prompts to test metalanguage and anaphora</h1>
        <InfoBlock>
          These two prompts test the ability to disambiguate anaphora. The first one is a single sentence and the second one expands.
        </InfoBlock>
        <CodeBlock code={`Make a table of all the pronouns in this sentence matched to what noun they refer to: Natasha was afraid that her mother would be worried and that's why she didn't tell her about her accident.`} />
        <CodeBlock code={`Make a table of all the pronouns in this text matched to what noun they refer to (for possessive pronouns include the noun and for subject or objects include the predicate in the table to make it easier to read): 

Natasha was afraid that her mother would be worried and that's why she didn't tell her about her accident. Her reaction, after she eventually told her about it, convinced her she had been right to wait because she was inconsolable until she promised her she would never drive in the dark again. `} />
      </>
    )
  },
  {
    id: 'writing-length',
    title: 'Writing Output Length',
    category: 'Writing',
    keywords: 'long form, essay, coherence, 7000 words',
    searchContent: `Most models cannot output text longer than about 3,000 words (even if the actual limit is higher). This prompt tests their ability to maintain coherence over the length of the output. Claude 3.7 Sonnet and Gemini 2.5 are the best at this with Gemini 2.5 being the only one that can output the full 7,000 words but struggling to maintain academic style throughout.
Write a full 7,000 word paper in the academic style including references about the dangers of placing the Earth's strategic icecream stockpile in the Sahara. Yes, this is a parody but I want high level of verisimilitude including length.`,
    content: (
      <>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Prompts to test writing output length and coherence</h1>
        <InfoBlock>
          Most models cannot output text longer than about 3,000 words (even if the actual limit is higher). This prompt tests their ability to maintain coherence over the length of the output. Claude 3.7 Sonnet and Gemini 2.5 are the best at this with Gemini 2.5 being the only one that can output the full 7,000 words but struggling to maintain academic style throughout.
        </InfoBlock>
        <CodeBlock code={`Write a full 7,000 word paper in the academic style including references about the dangers of placing the Earth's strategic icecream stockpile in the Sahara. Yes, this is a parody but I want high level of verisimilitude including length.`} />
      </>
    )
  },
  {
    id: 'multilingual-german',
    title: 'Multilingual: German',
    category: 'Multilingual',
    keywords: 'german, translation, rilke',
    searchContent: `The correct translation is “You do not have to understand life” even though the literal words say “You must not understand life”. German and English have different meanings when they negate the word must. English negates (reverses) the command to do something, German negates the requirement contained within the command.
Translate the title of the Rilke poem:  Du mußt das Leben nicht verstehen`,
    content: (
      <>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Prompts for multilingual performance</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">German translation</h2>
        <InfoBlock>
          The correct translation is “You do not have to understand life” even though the literal words say “You must not understand life”. German and English have different meanings when they negate the word must. English negates (reverses) the command to do something, German negates the requirement contained within the command.
        </InfoBlock>
        <CodeBlock code={`Translate the title of the Rilke poem:  Du mußt das Leben nicht verstehen`} />
      </>
    )
  },
  {
    id: 'multilingual-czech-metalanguage',
    title: 'Multilingual: Czech Metalanguage',
    category: 'Multilingual',
    keywords: 'czech, linguistics, totiz',
    searchContent: `Napiš 10 vět, které ilustrují různá použití slova totiž.
Write 10 sentences illustrating the use of the word totiž.`,
    content: (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Czech metalanguage</h2>
        <CodeBlock code={`Napiš 10 vět, které ilustrují různá použití slova totiž.`} />
        <CodeBlock code={`Write 10 sentences illustrating the use of the word totiž.`} />
      </>
    )
  },
  {
    id: 'multilingual-czech-morphology',
    title: 'Multilingual: Czech Morphology',
    category: 'Multilingual',
    keywords: 'czech, grammar, cases, apple, story',
    searchContent: `This requires a high level of metalinguistic awareness and ability to maintain this. No model performs perfectly on this task with Gemini 2.5 and Claude 3.7 Sonnet being the closest.
Shorter prompt with no instructions how to perform the task.
Napiš krátký příběh o jablku, kde každá další věta použije slovo jablko v jiném pádě. Začni prvním a skonči sedmým.
Write a short story about an apple in Czech, where each following sentence uses the word apple in a different grammatical case. Start with the first case and end with the seventh case.
Longer prompt encouraging reasoning.
Napiš krátký příběh o jablku, kde každá další věta použije slovo jablko v jiném pádě. Začni prvním a skonči sedmým. Začni tím, že vypíšeš všechny pády a formy slova jablko. Potom napiš příběh v jednom odstavci.
Write a short story about an apple, where each following sentence uses the word apple in a different grammatical case. Start with the first case and end with the seventh case. Begin by listing all the cases and forms of the word apple. Then write the story in one paragraph.`,
    content: (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Czech morphology</h2>
        <InfoBlock>
          This requires a high level of metalinguistic awareness and ability to maintain this. No model performs perfectly on this task with Gemini 2.5 and Claude 3.7 Sonnet being the closest.
        </InfoBlock>
        <p className="mb-2 italic text-gray-600">Shorter prompt with no instructions how to perform the task.</p>
        <CodeBlock code={`Napiš krátký příběh o jablku, kde každá další věta použije slovo jablko v jiném pádě. Začni prvním a skonči sedmým.`} />
        <CodeBlock code={`Write a short story about an apple in Czech, where each following sentence uses the word apple in a different grammatical case. Start with the first case and end with the seventh case.`} />
        <p className="mb-2 mt-6 italic text-gray-600">Longer prompt encouraging reasoning.</p>
        <CodeBlock code={`Napiš krátký příběh o jablku, kde každá další věta použije slovo jablko v jiném pádě. Začni prvním a skonči sedmým. Začni tím, že vypíšeš všechny pády a formy slova jablko. Potom napiš příběh v jednom odstavci.`} />
        <CodeBlock code={`Write a short story about an apple, where each following sentence uses the word apple in a different grammatical case. Start with the first case and end with the seventh case. Begin by listing all the cases and forms of the word apple. Then write the story in one paragraph.`} />
      </>
    )
  },
  {
    id: 'multilingual-cultural',
    title: 'Multilingual: Cultural Background',
    category: 'Multilingual',
    keywords: 'culture, prague, towers, nickname',
    searchContent: `The model’s answer should include the fact that Prague is often called “Praha stověžatá.” meaning - “hundred-towered Prague”. Smaller models often do not and larger models almost alway do.
Kolik je v Praze věží?
How many spires are there in Prague?
How many towers are there in Prague?
This prompt is to test whether the model has the knowledge about Prague’s nickname.
Jak se přezdívá Praze?
What is Prague's nickname?`,
    content: (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Cultural background</h2>
        <InfoBlock>
          The model’s answer should include the fact that Prague is often called “Praha stověžatá.” meaning - “hundred-towered Prague”. Smaller models often do not and larger models almost alway do.
        </InfoBlock>
        <CodeBlock code={`Kolik je v Praze věží?`} />
        <CodeBlock code={`How many spires are there in Prague?`} />
        <CodeBlock code={`How many towers are there in Prague?`} />
        
        <InfoBlock>
          This prompt is to test whether the model has the knowledge about Prague’s nickname.
        </InfoBlock>
        <CodeBlock code={`Jak se přezdívá Praze?`} />
        <CodeBlock code={`What is Prague's nickname?`} />
      </>
    )
  },
  {
    id: 'multilingual-idioms',
    title: 'Multilingual: Idiom Testing',
    category: 'Multilingual',
    keywords: 'idiom, czech, english, calculus',
    searchContent: `Knowledge about idioms. Here, the Czech words for ‘light’ and ‘heavy’ are used idiomatically to mean ‘easy’ and ‘hard’ in English but the idiom is contrasted into a sort of pun “Czech is as heavy as lead for non-Czechs and as light as a feather for Czechs.”
Translate this sentence into English with the appropriate English idioms taking into account how both languages use idioms to indicate something is  difficult and explain your choices:  Čeština je jazyk težký jako olovo pro nečechy, ale lehký jako pírko pro Čechy. 
Combining knowledge about idioms with culture. The model should take into account that Czech does not have a word for “calculus” as a subject - only differential and integral calculus - it is not taken as a subject in schools. At university level, it is referred to as ‘analysis’.
Translate this sentence into Czech: I never took calculus in high school.
Translate this sentence into Czech: I never took calculus in high school. Provide detailed commentary about your choices and explain why you rejected some options.`,
    content: (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Idiom testing</h2>
        <InfoBlock>
            Knowledge about idioms. Here, the Czech words for ‘light’ and ‘heavy’ are used idiomatically to mean ‘easy’ and ‘hard’ in English but the idiom is contrasted into a sort of pun “Czech is as heavy as lead for non-Czechs and as light as a feather for Czechs.”
        </InfoBlock>
        <CodeBlock code={`Translate this sentence into English with the appropriate English idioms taking into account how both languages use idioms to indicate something is  difficult and explain your choices:  Čeština je jazyk težký jako olovo pro nečechy, ale lehký jako pírko pro Čechy. `} />

        <InfoBlock>
            Combining knowledge about idioms with culture. The model should take into account that Czech does not have a word for “calculus” as a subject - only differential and integral calculus - it is not taken as a subject in schools. At university level, it is referred to as ‘analysis’.
        </InfoBlock>
        <CodeBlock code={`Translate this sentence into Czech: I never took calculus in high school.`} />
        <CodeBlock code={`Translate this sentence into Czech: I never took calculus in high school. Provide detailed commentary about your choices and explain why you rejected some options.`} />
      </>
    )
  },
  {
    id: 'small-models-knowledge',
    title: 'Small Models: Knowledge & Instruction',
    category: 'Small Models',
    keywords: 'small model, czech republic, history',
    searchContent: `A sequence of short prompts to test knowledge, coherence and instruction following of small models. Small models here mean models under 3b parameters. Models of 3b and over can usually maintain coherence in this sequence easily but models under 1.5 billion will struggle.
What is the capital of the Czech Republic? Answer in one word only.
Who was the first president of the independent Czechoslovakia?
Who succeeded him?
How has the country changed since then?`,
    content: (
      <>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Small model prompts</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Knowledge, coherence and instruction following</h2>
        <InfoBlock>
            A sequence of short prompts to test knowledge, coherence and instruction following of small models. Small models here mean models under 3b parameters. Models of 3b and over can usually maintain coherence in this sequence easily but models under 1.5 billion will struggle.
        </InfoBlock>
        <CodeBlock code={`What is the capital of the Czech Republic? Answer in one word only.`} />
        <CodeBlock code={`Who was the first president of the independent Czechoslovakia?`} />
        <CodeBlock code={`Who succeeded him?`} />
        <CodeBlock code={`How has the country changed since then?`} />
      </>
    )
  },
  {
    id: 'small-models-multilingual',
    title: 'Small Models: Multilingual',
    category: 'Small Models',
    keywords: 'grammar, czech, parts of speech',
    searchContent: `This prompt tests multilingual performance linked to knowledge. Even models of 14b will struggle with this - even if they can perform relatively will in Czech.
This is the correct answer but most small models will struggle to reproduce the language correctly. Even GPT-4o Mini does not perform consistently well.
Podstatná jména (nouns) - dům (house), kniha (book), stůl (table)
Přídavná jména (adjectives) - červený (red), malý (small), vysoký (tall)
Zájmena (pronouns) - já (I), ty (you), on (he)
Číslovky (numerals) - jeden (one), dva (two), tři (three)
Slovesa (verbs) - číst (to read), psát (to write), spát (to sleep)
Příslovce (adverbs) - rychle (quickly), pomalu (slowly), dobře (well)
Předložky (prepositions) - na (on), v (in), pod (under)
Spojky (conjunctions) - a (and), ale (but), nebo (or)
Částice (particles) - ano (yes), ne (no), asi (perhaps)
Citoslovce (interjections) - au! (ouch!), hurá! (hooray!), jejda! (oops!)
How many parts of speech are there in Czech? Answer in Czech. Make a list with examples.`,
    content: (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Multilingual performance</h2>
        <InfoBlock>
          <p>This prompt tests multilingual performance linked to knowledge. Even models of 14b will struggle with this - even if they can perform relatively will in Czech.</p>
          <p className="mt-2">This is the correct answer but most small models will struggle to reproduce the language correctly. Even GPT-4o Mini does not perform consistently well.</p>
          <ul className="list-disc list-inside mt-2 text-xs font-mono bg-gray-100 p-2 rounded">
            <li>Podstatná jména (nouns) - dům (house), kniha (book), stůl (table)</li>
            <li>Přídavná jména (adjectives) - červený (red), malý (small), vysoký (tall)</li>
            <li>Zájmena (pronouns) - já (I), ty (you), on (he)</li>
            <li>Číslovky (numerals) - jeden (one), dva (two), tři (three)</li>
            <li>Slovesa (verbs) - číst (to read), psát (to write), spát (to sleep)</li>
            <li>Příslovce (adverbs) - rychle (quickly), pomalu (slowly), dobře (well)</li>
            <li>Předložky (prepositions) - na (on), v (in), pod (under)</li>
            <li>Spojky (conjunctions) - a (and), ale (but), nebo (or)</li>
            <li>Částice (particles) - ano (yes), ne (no), asi (perhaps)</li>
            <li>Citoslovce (interjections) - au! (ouch!), hurá! (hooray!), jejda! (oops!)</li>
          </ul>
        </InfoBlock>
        <CodeBlock code={`How many parts of speech are there in Czech? Answer in Czech. Make a list with examples.`} />
      </>
    )
  },
  {
    id: 'creative-writing-wodehouse',
    title: 'Creative Writing: Wodehouse',
    category: 'Creative Writing',
    keywords: 'wodehouse, style transfer, writing',
    searchContent: `Results are shared on https://aicreationexperiments.notion.site.
Take this text and rewrite it in the style of PG Wodehouse. 
Linda was furious. She was running really hard to catch a bus and the bus driver slammed the door shut in her face.
Expand it with the full Wodehouse style narrative elements.`,
    content: (
      <>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Creative writing testing</h1>
        <p className="mb-4 text-sm text-gray-600">Results are shared on <a href="https://aicreationexperiments.notion.site" className="text-primary-600 hover:underline">https://aicreationexperiments.notion.site</a>.</p>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Wodehouse variations</h2>
        <CodeBlock code={`Take this text and rewrite it in the style of PG Wodehouse. 

Linda was furious. She was running really hard to catch a bus and the bus driver slammed the door shut in her face.`} />
        <CodeBlock code={`Expand it with the full Wodehouse style narrative elements.`} />
      </>
    )
  },
  {
    id: 'creative-writing-poetry',
    title: 'Creative Writing: Poetry',
    category: 'Creative Writing',
    keywords: 'poetry, czech, rhyming, translation',
    searchContent: `Translate this into English:

**Večerní píseň**
Když bylo dobře mamince,
bylo i pěkně v našem bytě.
Hmoždíř, který stal na skříňce,
zatřpytil se okamžitě,
skla oken, po nichž před chvilkou
plakalo ještě bílé jiní,
svítila opět po kuchyni,
kde vonělo to vanilkou.

Když zpívala, hned vesele
spustili ptáci před okny nám.
Měla-li mráček na čele,
odletěli hned ptáci jinam.
Zmlkli jsme rázem, ztichl smích.
I černé kotě, které tlapkou
pohrávalo si se skořápkou,
dívalo se jí po očích.

Když padala již únavou
a večer spát nás odnášela,
tou rukou drsnou od popela
stlala nám měkce pod hlavou.
V hořáku ještě přede plyn
a nad pelestí přechází nám,
podobaje se pavučinám,
velikánský stín maminčin.

Dnes už tak šťastně neusínám.
Replicate the rhyme scheme.
Write a short three stanza poem about spring in Czech. Make sure it rhymes.
Now change the rhyme scheme to ABAB.
Now rewrite it in the style of the top 5 most famous Czech poets of the 19th and 20th century.`,
    content: (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Czech poetry translation</h2>
        <CodeBlock code={`Translate this into English:

**Večerní píseň**
Když bylo dobře mamince,
bylo i pěkně v našem bytě.
Hmoždíř, který stal na skříňce,
zatřpytil se okamžitě,
skla oken, po nichž před chvilkou
plakalo ještě bílé jiní,
svítila opět po kuchyni,
kde vonělo to vanilkou.

Když zpívala, hned vesele
spustili ptáci před okny nám.
Měla-li mráček na čele,
odletěli hned ptáci jinam.
Zmlkli jsme rázem, ztichl smích.
I černé kotě, které tlapkou
pohrávalo si se skořápkou,
dívalo se jí po očích.

Když padala již únavou
a večer spát nás odnášela,
tou rukou drsnou od popela
stlala nám měkce pod hlavou.
V hořáku ještě přede plyn
a nad pelestí přechází nám,
podobaje se pavučinám,
velikánský stín maminčin.

Dnes už tak šťastně neusínám.`} />
        <CodeBlock code={`Replicate the rhyme scheme.`} />
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Czech poetry writing</h2>
        <CodeBlock code={`Write a short three stanza poem about spring in Czech. Make sure it rhymes.`} />
        <CodeBlock code={`Now change the rhyme scheme to ABAB.`} />
        <CodeBlock code={`Now rewrite it in the style of the top 5 most famous Czech poets of the 19th and 20th century.`} />
      </>
    )
  },
  {
    id: 'image-generation',
    title: 'Image & Video Generation',
    category: 'Generation',
    keywords: 'image generation, video generation, midjourney, dalle',
    searchContent: `Picture of a wineglass full to the brim with a clock on the wall behind it showing half past three.
Make a widescreen photorealistic image of a cute and friendly robot painter standing in front of an Oxford library with a canvas with a painting of a futuristic scene. There's a speech bubble above the robot's head that says 'I am a diffusion painter from the future.'
Make a pencil drawing of a painter without a beard.
Make a realitic photo of a group of people in front of a Prague statue. They are all laughing uproariously and waving at the camera.
A cartoon of Karel  Čapek shaking hands with a Robot from the future and saying: Aha, tak tohle jsem si nepředstavoval.
Make a three panel cartoon. In the first panel a robot is coming to the office that says Alan Turing on it. In the second panel, the robot is facing Alan Turing and the robot is saying "I'm here to take your test." In the third panel, Alan Turing stares in surprise and says "I was not expecting you until 2000."
Less ambiguous version of the above:
Make a three panel cartoon. In the first panel a cute and friendly robot is coming to the office. There is a sign with Alan Turing on the door. In the second panel, the robot is facing Alan Turing inside his offiece and the robot is saying "I'm here to take your test." In the third panel, Alan Turing stares in surprise and says "I was not expecting you until 2000."
Videos
An cute and friendly robot is walking thorugh an Oxford library picking books from the shelves at random and throwing them in the air.
Make an humorous but educational image of a venn diagram explaining the origin and current use of Venn Diagrams. Think hard but do not do any research.
Research the history of the perceptron and make an illustrated timeline with key milestones and figures.`,
    content: (
      <>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Image/video generation testing</h1>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Images</h2>
        <CodeBlock code={`Picture of a wineglass full to the brim with a clock on the wall behind it showing half past three.`} />
        <CodeBlock code={`Make a widescreen photorealistic image of a cute and friendly robot painter standing in front of an Oxford library with a canvas with a painting of a futuristic scene. There's a speech bubble above the robot's head that says 'I am a diffusion painter from the future.'`} />
        <CodeBlock code={`Make a pencil drawing of a painter without a beard.`} />
        <CodeBlock code={`Make a realitic photo of a group of people in front of a Prague statue. They are all laughing uproariously and waving at the camera.`} />
        <CodeBlock code={`A cartoon of Karel  Čapek shaking hands with a Robot from the future and saying: Aha, tak tohle jsem si nepředstavoval.`} />
        <CodeBlock code={`Make a three panel cartoon. In the first panel a robot is coming to the office that says Alan Turing on it. In the second panel, the robot is facing Alan Turing and the robot is saying "I'm here to take your test." In the third panel, Alan Turing stares in surprise and says "I was not expecting you until 2000."`} />
        
        <p className="mb-2 italic text-gray-600">Less ambiguous version of the above:</p>
        <CodeBlock code={`Make a three panel cartoon. In the first panel a cute and friendly robot is coming to the office. There is a sign with Alan Turing on the door. In the second panel, the robot is facing Alan Turing inside his offiece and the robot is saying "I'm here to take your test." In the third panel, Alan Turing stares in surprise and says "I was not expecting you until 2000."`} />

        <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Videos</h2>
        <CodeBlock code={`An cute and friendly robot is walking thorugh an Oxford library picking books from the shelves at random and throwing them in the air.`} />

        <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Advanced Reasoning Image Generation</h2>
        <CodeBlock code={`Make an humorous but educational image of a venn diagram explaining the origin and current use of Venn Diagrams. Think hard but do not do any research.`} />
        <CodeBlock code={`Research the history of the perceptron and make an illustrated timeline with key milestones and figures.`} />
      </>
    )
  },
  {
    id: 'long-context-anachronisms',
    title: 'Long Context: Anachronisms',
    category: 'Long Context',
    keywords: 'anachronism, psmith, wodehouse, logic',
    searchContent: `Find anything that seems out of place. Find all anachronisms. [Attachment: PsmithJournalist-test.txt]
Correct answers:
"Big Macs": In Chapter III, Psmith speculates about what might be in a basket, dismissing "Big Macs". The Big Mac sandwich was first introduced by McDonald's in 1967, decades after the story's setting (around 1915 ).
Personal Computer: In Chapter IV, Billy Windsor's room is described as containing "a computer—nobody uses pens in New York". Personal computers did not exist in the 1910s.
Air Travel: In Chapter XII, mention is made of a "PanAm flight was slowly making its descent towards La Guardia". Pan American Airways was founded in 1927, and La Guardia Airport opened in 1939. Commercial air travel was in its infancy in 1915 and not a common sight over New York City.
Email: In Chapter XXII, Psmith offers to send Mr. Waring "an email". Email technology did not exist at the time the story is set.`,
    content: (
      <>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Long-Context Information retrieval</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Finding anachronisms</h2>
        <FileAttachment 
          filename="PsmithJournalist-test.txt" 
          path="samplefiles/PsmithJournalist-test.txt" 
          content={psmithText}
        />
        <InfoBlock>
            <p className="font-semibold">Correct answers:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
                <li><strong>"Big Macs"</strong>: In Chapter III, Psmith speculates about what might be in a basket, dismissing "Big Macs". The Big Mac sandwich was first introduced by McDonald's in 1967, decades after the story's setting (around 1915 ).</li>
                <li><strong>Personal Computer</strong>: In Chapter IV, Billy Windsor's room is described as containing "a computer—nobody uses pens in New York". Personal computers did not exist in the 1910s.</li>
                <li><strong>Air Travel</strong>: In Chapter XII, mention is made of a "PanAm flight was slowly making its descent towards La Guardia". Pan American Airways was founded in 1927, and La Guardia Airport opened in 1939. Commercial air travel was in its infancy in 1915 and not a common sight over New York City.</li>
                <li><strong>Email</strong>: In Chapter XXII, Psmith offers to send Mr. Waring "an email". Email technology did not exist at the time the story is set.</li>
            </ul>
        </InfoBlock>
        <CodeBlock code={`Find anything that seems out of place.`} />
        <CodeBlock code={`Find all anachronisms.`} />
      </>
    )
  },
  {
    id: 'long-context-retrieval',
    title: 'Long Context: Retrieval',
    category: 'Long Context',
    keywords: 'retrieval, psmith, questions',
    searchContent: `Find answers to all of these questions along with chapter numbers where they occur and the exact quotes that support the answer:

1. Who runs the magazine which is at the centre of the story, who named it and who owns it.
2. Who is the second character from Wyoming and what does he do?
3. Who is a prominent cat lover in the story? 
4. What happens at the end of chapter 25?
5. What were the pleasantries the main character and the owner of the tenements exchanged when the latter came in? Replicate the exchange word for word until the point the introductions are concluded.
Answers:
1. Who runs the magazine which is at the centre of the story, who named it and who owns it.
		Mr Wilberfloss, Cozy Moments
		Chapter I
		Introduced by: Mr. J. Fillken Wilberfloss, editor-in-chief of _Cosy Moments_, was about to leave his post and start on a ten weeks' holiday.
		_Cosy Moments_, as its name (an inspiration of Mr. Wilberfloss's own) is designed to imply, is a journal for the home.
		
		It was founded by its proprietor, Mr. Benjamin White, as an antidote to yellow journalism.
		
2. Who is the second character from Wyoming and what does he do?
		Chapter IX
		"That was Kid Brady."
		
		"The name is unfamiliar to me. Another contributor?"
		
		"He's from my part of the country—Wyoming. He wants to fight any one in the world at a hundred and thirty-three pounds."

3. Who is a prominent cat lover in the story? 
		Chapter IV
		"Guess I know where dat kitty belongs. Dey all have dose collars. I guess she's one of Bat Jarvis's kitties. He's got a lot of dem for fair, and every one wit one of dem collars round deir neck."
		
		"Who's Bat Jarvis? Do you mean the gang-leader?"
		
		"Sure. He's a cousin of mine," said Master Maloney with pride.
		
		"Is he?" said Billy. "Nice sort of fellow to have in the family. So you think that's his cat?"
		
4. What happens at the end of chapter 25?

		They went out into the street, Psmith thoughtful and hardly realising the other's presence. By the side of the pavement a few yards down the road a taximeter-cab was standing. Psmith hailed it.
		
		Mr. Parker was still beside him. It occurred to Psmith that it would not do to let him hear the address Billy Windsor had given in his note.
		
		"Turn and go on down the street," he said to the driver.
		
		He had taken his seat and was closing the door, when it was snatched from his grasp and Mr. Parker darted on to the seat opposite. The next moment the cab had started up the street instead of down and the hard muzzle of a revolver was pressing against Psmith's waistcoat.
		
		"Now what?" said Mr. Parker smoothly, leaning back with the pistol resting easily on his knee.
		
5. What were the pleasantries the main character and the owner of the tenements exchanged when the latter came in? Replicate the exchange word for word until the point the introductions are concluded.

	Psmith had risen to greet him.
	
	"Won't you sit down?" he said.
	
	"I prefer to stand."
	
	"Just as you wish. This is Liberty Hall."
	
	Mr. Waring again glanced at Mr. Wilberfloss.
	
	"What I have to say is private," he said.
	
	"All is well," said Psmith reassuringly. "It is no stranger that you see before you, no mere irresponsible lounger who has butted in by chance. That is Comrade J. Fillken Wilberfloss, the editor of this journal."
	
	"The editor? I understood—"
	
	"I know what you would say. You have Comrade Windsor in your mind. He was merely acting as editor while the chief was away hunting sand-eels in the jungles of Texas. In his absence Comrade Windsor and I did our best to keep the old journal booming along, but it lacked the master-hand. But now all is well: Comrade Wilberfloss is once more doing stunts at the old stand. You may speak as freely before him as you would before well, let us say Comrade Parker."
	
	"Who are you, then, if this gentleman is the editor?"
	
	"I am the proprietor."
	
	"I understood that a Mr. White was the proprietor."
	
	"Not so," said Psmith. "There was a time when that was the case, but not now. Things move so swiftly in New York journalistic matters that a man may well be excused for not keeping abreast of the times, especially one who, like yourself, is interested in politics and house-ownership rather than in literature. Are you sure you won't sit down?"
Check prompt to exclude knowledge:
Based on your knowledge of PG Wodehouse's Psmith, Journalist, find answers to all of these questions along with chapter numbers where they occur and the exact quotes that support the answer:

1. Who runs the magazine which is at the centre of the story, who named it and who owns it.
2. Which secondary but still important character is from Wyoming and what does he do?
3. Who is a prominent cat lover in the story? 
4. What happens at the end of chapter 25?
5. What were the pleasantries the main character and the owner of the tenements exchanged when the latter came in? Replicate the exchange word for word until the point the introductions are concluded.`,
    content: (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Retrieving information</h2>
        <div className="bg-gray-100 p-3 rounded mb-4 font-mono text-xs border border-gray-300">
            [Attachment: PsmithJournalist-full.md]
        </div>
        <CodeBlock code={`Find answers to all of these questions along with chapter numbers where they occur and the exact quotes that support the answer:

1. Who runs the magazine which is at the centre of the story, who named it and who owns it.
2. Who is the second character from Wyoming and what does he do?
3. Who is a prominent cat lover in the story? 
4. What happens at the end of chapter 25?
5. What were the pleasantries the main character and the owner of the tenements exchanged when the latter came in? Replicate the exchange word for word until the point the introductions are concluded.`} />
        
        <CodeBlock code={`Answers:
1. Who runs the magazine which is at the centre of the story, who named it and who owns it.
		Mr Wilberfloss, Cozy Moments
		Chapter I
		Introduced by: Mr. J. Fillken Wilberfloss, editor-in-chief of _Cosy Moments_, was about to leave his post and start on a ten weeks' holiday.
		_Cosy Moments_, as its name (an inspiration of Mr. Wilberfloss's own) is designed to imply, is a journal for the home.
		
		It was founded by its proprietor, Mr. Benjamin White, as an antidote to yellow journalism.
		
2. Who is the second character from Wyoming and what does he do?
		Chapter IX
		"That was Kid Brady."
		
		"The name is unfamiliar to me. Another contributor?"
		
		"He's from my part of the country—Wyoming. He wants to fight any one in the world at a hundred and thirty-three pounds."

3. Who is a prominent cat lover in the story? 
		Chapter IV
		"Guess I know where dat kitty belongs. Dey all have dose collars. I guess she's one of Bat Jarvis's kitties. He's got a lot of dem for fair, and every one wit one of dem collars round deir neck."
		
		"Who's Bat Jarvis? Do you mean the gang-leader?"
		
		"Sure. He's a cousin of mine," said Master Maloney with pride.
		
		"Is he?" said Billy. "Nice sort of fellow to have in the family. So you think that's his cat?"
		
4. What happens at the end of chapter 25?

		They went out into the street, Psmith thoughtful and hardly realising the other's presence. By the side of the pavement a few yards down the road a taximeter-cab was standing. Psmith hailed it.
		
		Mr. Parker was still beside him. It occurred to Psmith that it would not do to let him hear the address Billy Windsor had given in his note.
		
		"Turn and go on down the street," he said to the driver.
		
		He had taken his seat and was closing the door, when it was snatched from his grasp and Mr. Parker darted on to the seat opposite. The next moment the cab had started up the street instead of down and the hard muzzle of a revolver was pressing against Psmith's waistcoat.
		
		"Now what?" said Mr. Parker smoothly, leaning back with the pistol resting easily on his knee.
		
5. What were the pleasantries the main character and the owner of the tenements exchanged when the latter came in? Replicate the exchange word for word until the point the introductions are concluded.

	Psmith had risen to greet him.
	
	"Won't you sit down?" he said.
	
	"I prefer to stand."
	
	"Just as you wish. This is Liberty Hall."
	
	Mr. Waring again glanced at Mr. Wilberfloss.
	
	"What I have to say is private," he said.
	
	"All is well," said Psmith reassuringly. "It is no stranger that you see before you, no mere irresponsible lounger who has butted in by chance. That is Comrade J. Fillken Wilberfloss, the editor of this journal."
	
	"The editor? I understood—"
	
	"I know what you would say. You have Comrade Windsor in your mind. He was merely acting as editor while the chief was away hunting sand-eels in the jungles of Texas. In his absence Comrade Windsor and I did our best to keep the old journal booming along, but it lacked the master-hand. But now all is well: Comrade Wilberfloss is once more doing stunts at the old stand. You may speak as freely before him as you would before well, let us say Comrade Parker."
	
	"Who are you, then, if this gentleman is the editor?"
	
	"I am the proprietor."
	
	"I understood that a Mr. White was the proprietor."
	
	"Not so," said Psmith. "There was a time when that was the case, but not now. Things move so swiftly in New York journalistic matters that a man may well be excused for not keeping abreast of the times, especially one who, like yourself, is interested in politics and house-ownership rather than in literature. Are you sure you won't sit down?"`} />

        <p className="mb-2 italic text-gray-600">Check prompt to exclude knowledge:</p>
        <CodeBlock code={`Based on your knowledge of PG Wodehouse's Psmith, Journalist, find answers to all of these questions along with chapter numbers where they occur and the exact quotes that support the answer:

1. Who runs the magazine which is at the centre of the story, who named it and who owns it.
2. Which secondary but still important character is from Wyoming and what does he do?
3. Who is a prominent cat lover in the story? 
4. What happens at the end of chapter 25?
5. What were the pleasantries the main character and the owner of the tenements exchanged when the latter came in? Replicate the exchange word for word until the point the introductions are concluded.`} />
      </>
    )
  },
  {
    id: 'vision',
    title: 'Vision',
    category: 'Vision',
    keywords: 'vision, image analysis, czech joke, concept map',
    searchContent: `Czech joke [Image: czechjoke.png]
Concept map to propositions [Image: conceptmap.png]
Correct answer
chunking	facilitated by	rehearsal strategies
attention	affects	information maintenance
rehearsal strategies	improve	information maintenance
central executive	processes information from	phonological loop
chunking	reduces	load
chunking	improves	information maintenance
central executive	limited by	capacity
central executive	processes information from	visuospatial sketchpad
auditory input	processed by	phonological loop
load	decreases	capacity
load	decreased by	fewer distractions
Image without semantic anchors [Image: imagewithoutanchors.png]`,
    content: (
      <>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Vision</h1>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Czech joke</h2>
        <PlaceholderImage alt="Czech Joke Image" filename="czechjoke.png" />
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Concept map to propositions</h2>
        <PlaceholderImage alt="Concept Map" filename="conceptmap.png" />
        <InfoBlock>
            <p className="font-semibold">Correct answer</p>
            <ul className="list-none space-y-1 font-mono text-sm mt-2">
                <li>chunking	facilitated by	rehearsal strategies</li>
                <li>attention	affects	information maintenance</li>
                <li>rehearsal strategies	improve	information maintenance</li>
                <li>central executive	processes information from	phonological loop</li>
                <li>chunking	reduces	load</li>
                <li>chunking	improves	information maintenance</li>
                <li>central executive	limited by	capacity</li>
                <li>central executive	processes information from	visuospatial sketchpad</li>
                <li>auditory input	processed by	phonological loop</li>
                <li>load	decreases	capacity</li>
                <li>load	decreased by	fewer distractions</li>
            </ul>
        </InfoBlock>

        <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Image without semantic anchors</h2>
        <PlaceholderImage alt="Image without anchors" filename="imagewithoutanchors.png" />
      </>
    )
  },
  {
    id: 'agentic-tasks',
    title: 'Agentic Tasks',
    category: 'Agents',
    keywords: 'agents, research, oxford, tools',
    searchContent: `Make a list of Oxford museums and galleries that are within 10-15 minute walking distance of Jesus College for conference attendees. Create a table with opening times, description and a link to a google maps with walking directions from Jesus College.
What are the effects of culture shock on international students' experience of their studies and in particular learning outcomes? Are there any differences between the source and target cultures? What cultures have been most studied and what dimensions of culture have been addressed?
There is no one right way to answer it but an expert in the field can review the results and see whether they are broadly consonant with what is known.
We can evaluate the choice of sources - research vs shallow guidance vs personal accounts.
Create a list of open language models I can run on a Mac today. Which ones would be best for which configuration and how to best run them. I'm thinking about what is the best I can do for budgets from £500 to £10,000. Which models should I choose for different configurations and what sort of things can I do with them
The correct answer will vary with time but the judgement of quality`,
    content: (
      <>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Agentic tasks and tool use</h1>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Agentic behavior of reasoning models</h2>
        <CodeBlock code={`Make a list of Oxford museums and galleries that are within 10-15 minute walking distance of Jesus College for conference attendees. Create a table with opening times, description and a link to a google maps with walking directions from Jesus College.`} />
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Deep Research / Agentic Search Prompt 1 - Established field</h2>
        <CodeBlock code={`What are the effects of culture shock on international students' experience of their studies and in particular learning outcomes? Are there any differences between the source and target cultures? What cultures have been most studied and what dimensions of culture have been addressed?`} />
        <p className="my-4 text-gray-700">There is no one right way to answer it but an expert in the field can review the results and see whether they are broadly consonant with what is known.</p>
        <p className="my-4 text-gray-700">We can evaluate the choice of sources - research vs shallow guidance vs personal accounts.</p>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Deep Research / Agentic Search Prompt 2 - Developing field with uncertain sources</h2>
        <CodeBlock code={`Create a list of open language models I can run on a Mac today. Which ones would be best for which configuration and how to best run them. I'm thinking about what is the best I can do for budgets from £500 to £10,000. Which models should I choose for different configurations and what sort of things can I do with them`} />
        <p className="my-4 text-gray-700">The correct answer will vary with time but the judgement of quality</p>
      </>
    )
  }
];