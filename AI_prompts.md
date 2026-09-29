# AI Prompt Log

This file records the prompts used for Homework 4. Prompts should be added to the relevant problem section in the order they are sent.

## Homework Context

Campus Customs (see hw 3 for additional background) needs a customer-facing website with an intelligent chatbot. The goal is a React + Vite TypeScript frontend and a Python FastAPI backend using a PydanticAI agent. Shoppers should be able to browse products, create accounts, and have conversations about merch, with matching items appearing on the page and honest answers about price and stock drawn from a local database.

Data provided:
- `campus_customs.db` — SQLite database with `catalogue`, `inventory`, and `users` tables (one test user prepopulated). Product image file paths are stored in the `catalogue` table.
- `data/products` — product images, with paths matching the `catalogue` table.
- yalebulldogblue.com should be researched for the Campus Customs style and for information to inform the agent prompt.

A `.env` file holds `PORTKEY_API_KEY`; the model is `gpt-5.6-terra` (overriding the project default), and work is done in a venv.

At the end, the project is pushed to a public GitHub repo and the repo URL is submitted. The database and product images must NOT be committed.

## Problem 1: Vibe coder prompts

**First prompt timestamp:** 2026-09-27 19:20:33 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. Create AI_prompts.md with the same structure as for previous homework assignments.

### Why a Second Prompt Was Needed

Not applicable.

## Problem 2: Analyze the database

**First prompt timestamp:** 2026-09-28 14:13:48 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. Analyze the data/campus_customs.db database and understand the fields in the tables (e.g., catalogue, inventory and users).
   Create output/harness.md. Write down each table and its fields as well as a one liner on the importance of each field for the shop or the chatbot

### Why a Second Prompt Was Needed

Not applicable.

## Problem 3: Build the Campus Customs website.

**First prompt timestamp:** 2026-09-28 14:26:56 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. Scaffold a React, Vite and TypeSCript front end for the shop. There should be a nav bat at the top that links to the main pages:

   Home
   Products
   About Us
   Log in
   Create account

   You should use Campus Customs-style wording from yalebulldogblue.come for Home and About Us although rewrite it in my voice (example of an essay I wrote below use it primarily for the writing style as this was for a scholarship application).

   The products page should show product images from the catalogue (using the image paths of the database) and include product info (name, price, short description).

   Each product should open to a single-item page (Large image on one side, full product text on the other with description, price, sizes/stock when they are in stock). Clicking a card on Products should bring a shopper to this page.

   There should also be a chat interface in the bottom right of webpage (It can also be a floating chat panel).  It can be a stub for now that we will integrate with the backend later.

   We should also have a small API to read the database (simple FastAPI app in backend/main.py is good enough for now to serve the products and images before turning into agent backend in Problem 5).

   Example essay (for my voice):

   The kind of legacy that I would like to leave behind is one that would stimulate the growth of the next generation. I have long believed in the ability of scholarships to change the lives of students as they alleviate the burden of having to pay for school and allow the student to focus on their academics instead of having to work part-time or take out student loans. However, I would like to create a scholarship that would also provide an internship opportunity to the student. This would allow the student also have work experiences, which is critical nowadays to differentiate oneself. I have always believed that a well-rounded individual would be better setup for success and that is what I would hope to achieve with this new twist on scholarships. Hopefully, this would also give me the opportunity to mentor the youth and provide professional guidance which I find is sorely lacking, barring a 15-minute meeting with a career counsellor who barely knows your name by the time you walk out the door. A moonshot legacy and a dream of mine would be to acquire the naming rights to one of the buildings at my alma mater. While contributing to the university’s mission, this would also hopefully inspire the thousands of children who visit the university not only from Canada and Korea but also from the rest of the world and show them that they too can be successful no matter your background. 

   As a Korean Canadian student, I believe that a way to elicit change to better our society is to be more visible in all parts of society. I have witnessed that the sentiment towards Korean people has changed drastically over the course of my life as people gradually got exposed to Korean culture and brands. Although there is genuine enjoyment of our culture there is also the associated prestige from Korean products and brands being present in every part of people’s lives. Indeed, in that same manner, I believe that if more Korean Canadian people who have found success in their fields whether it is in business, politics, socially or otherwise increased their visibility and outreach in the community, students like myself would have more role-models to look up to who have gone through the same things we have, and the broader society would learn more of our community as they also see these leaders who hopefully will become a household name much like the members of other ethnic communities. It is my hope that this will lead to greater understanding and give a greater voice to future Korean Canadian students who will hopefully use it for the greater good.

   All in all, I believe that I am a strong all-rounder with accomplishments in many aspects of my life. I have shown through an active lifestyle, excellence academically, and as a leader in the community that I am more than ready to grow and succeed. I have had my share of challenges which I ultimately overcame and through which I learnt lessons that wouldn’t have been possible otherwise. Yet, I still feel that I can do much more and will keep striving to do better and to keep enjoying life to the fullest. I hope that I will be able to continue on this path with the support of this scholarship.

### Why a Second Prompt Was Needed

Not applicable.

## Problem 4: Create account and login

**First prompt timestamp:** 2026-09-28 15:02:41 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. Build a normal create-account / login flow.
   Create account should include first name, last name, email, password, confirm password (include standard complexity requirement)
   Log in: email and password

   New accounts should be added to the users table. Passwords should be stored securely so hackers whether they are human or AI cannot access them.

   The seed database has a test user which can be used while building. Confirm that you can log in as that user and that a brand-new account I create works.

   Update harness.md with how auth works (what is stored for a each user and how passwords are protected)

### Why a Second Prompt Was Needed

The first prompt asked me to confirm login as the seed test user but did not give that user's password. The database stores only a one-way hash, so the password could not be recovered from it, and the follow-up prompts supplied the credentials.

### Additional Prompts

2. The test users email is test@campuscustoms.yale.edu and password is: password

   Timestamp: not captured when sent (sent after 15:02:41 EDT and before prompt 3)

3. Let's do problem 4.
   Title: Create account and login
   First prompt:

   Build a normal create-account / login flow.
   Create account should include first name, last name, email, password, confirm password (include standard complexity requirement)
   Log in: email and password

   New accounts should be added to the users table. Passwords should be stored securely so hackers whether they are human or AI cannot access them.

   The seed database has a test user which can be used while building (email: test@campuscustoms.yale.edu, password: password) Confirm that you can log in as that user and that a brand-new account I create works.

   Update harness.md with how auth works (what is stored for a each user and how passwords are protected)

   Timestamp: 2026-09-28 15:06:15 EDT

## Problem 5: PydanticAI agent backend

**First prompt timestamp:** 2026-09-28 18:26:46 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. Build the chatbot using a PydanticAI agent behind FastAPI which should be connected to my front-end chat. The API app should be in backend/main.py (file run with Uvicorn). The agent should be these 4 files:

   backend/prompts/prompt.md which is the system prompt
   backend/agent.py which is the agent entry and wiring
   backend/tools.py which are the tools the agent can call
   backend/models.py which are the Pydantic/PydanticAI structured types

   main.py should expose a chat route so a message from the website returns a reply from the agent and everything else required (e.g., products, auth). 

   prompt.md should include the campus customs voice and safety basics and create types in models.py for chat replies and product cards as needed.

   output/harness.md should note how the front end communicates with FastAPI and how the agent is loaded (prompt file and model).

   The backend should from the backend/ folder like this:

   uvicorn main:app --reload --port 8000

### Why a Second Prompt Was Needed

The first prompt asked for the chatbot to be built, not run, so the agent was verified offline with a scripted stand-in model and no live model call. Port 8000 was also held by the lecture 7 backend, so the server ran on 8001. The second prompt requested a live test against the real model and asked for the backend to be moved to port 8000 as specified.

### Additional Prompts

2. Run a live test and use port 8000 (make the lecture 7 backend release or kill it)

   Timestamp: 2026-09-28 18:42:01 EDT

## Problem 6: Tools: product info and stock

**First prompt timestamp:** 2026-09-28 18:59:42 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. Let's create tools for the agent to look up real information from the campus_customs.db database.

   Product description
   Price
   Stock quantity (by size when the customer asks)

   The agent should not invent values and rely exclusively on the database. When out of stock, it should say so explicitly.

   Add/modify prompt.md so that the agent utilizes these tools for price and stock questions as well as the return types in models.py.

   harness.md should list each tool and explain which model fields were chosen for lookup results and why

   Do a live test.

### Why a Second Prompt Was Needed

Not applicable.

## Problem 7: Chat search that updates the page

**First prompt timestamp:** 2026-09-28 19:11:03 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. Time for an additional feature. When a customer asks about a type of item (e.g., “what hoodies do you have”). 1) The agent should search the catalogue and 2) the website should dynamically show the matching items as product cards including the image, name, price and short description  This should be an API contract (e.g., agent returns structured product matches and front end renders them). It looks awesome.  After the dynamic product cards are loaded by the feature, ensure that the same single-item page behaviour from problem 3 still works (i.e., each product card including the ones that the chat put on the page should open the detailed view when clicked)  Update prompt.md and harness.md to include how search results reach the page

   Do a live test

### Why a Second Prompt Was Needed

Not applicable.

## Problem 8: Customer memory

**First prompt timestamp:** 2026-09-28 19:19:52 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. If a shopper is logged in, their chat history should be saved to a database within a table and it should be reloaded when they return. The agent should be able to identify who is chatting based on the name/email. Include this in the agent tools.  The agent should be passed enough page context that if the shopper asks “do you have this in pink?” from a product page, the agent knows what item is meant. Add code to the agent context. 
   Guests should still be able to chat but history persistence is only for logged-in users.  Document harness.md with how user chat history is stored, what customer fields the agent sees and how the page context is passed 
   Do a live test

### Why a Second Prompt Was Needed

Not applicable.

## Problem 9: Usability improvements

**First prompt timestamp:** 2026-09-28 19:32:49 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. In this problem I need to select and implement 2 frontend and 2 backend usability improvements.  Propose 5 improvements for the front end and 5 for the backend for me to select.  Frontend improvements should make the site look better or easier to user Backend improvements should make the agent output better, more accurate or safer (e.g., new agent tools or things to make the agent faster or cheaper)

   Create output/usability.md after I’ve selected the improvements which includes what was added and why it helps a shopper or the campus customs.   All selected improvements need to actually be present in the running app. Graders will read usability.md and look for the features.

### Why a Second Prompt Was Needed

The first prompt asked for 5 frontend and 5 backend proposals to choose from. Before selecting, I asked a clarifying question about whether proposal B2 (typo-tolerant search) was already handled by the agent.

### Additional Prompts

2. To clarify doesn't the agent automatically already handle B2?

   Timestamp: 2026-09-28 19:38:09 EDT

3. For B4 why would these information be sent through the chat?

   Timestamp: 2026-09-28 19:40:39 EDT

4. Let's do F1, F3, B2 and B4.

   Timestamp: 2026-09-28 19:43:23 EDT

## Problem 10: Style the website

**First prompt timestamp:** 2026-09-28 19:58:00 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. Time to be creative. This problem will reward those who are most imaginative and innovative with their design. Invest significant effort into this. I want the professor and TA’s to be wowed

   Add creative design to the site so that it feels like a real Campus Customs storefront (e.g., fronts, colour, hierarchy, motion, product presentation, chat feel). 

   Ensure that all of the functionality we have built until now is still functioning.

   Write output/design.md including what was changed and why it will help customer attention and buying. It should be concrete and brief

### Why a Second Prompt Was Needed

The first prompt produced the redesign, which was verified in the built-in preview browser. The second prompt asked for the redesigned site to be opened in Chrome to review it directly.

### Additional Prompts

2. open it in chrome

   Timestamp: 2026-09-28 22:33:11 EDT

## Problem 11: Site testing (app check)

**First prompt timestamp:** 2026-09-28 22:45:30 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. The goal of this problem is to test the live site and document it in output/app_check.html (a page which you should be able to double click open). The page should include clear screenshots and captions for the following:

   1. Chat checking the inventory level of an item (honest stock/price from the DB)
   2. The dynamic search-result cards appearing after a category question (E.g., hoodies)
   3. One of the usability features from problem 9

   The page should be easy to grade:
   Each should have a heading, screenshot and 2 sentences on what the screenshot proves. The screenshot image files should be in output/app_check_images and should be linked from app_check.html with relative paths like app_check_images/inventory.png for example

### Why a Second Prompt Was Needed

Not applicable.

## Problem 12: Audit trail, safety, finish harness

**First prompt timestamp:** 2026-09-28 22:55:19 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. Create an append-only output/audit_trail.json for agent-loop activity (time, tool name, short args/result, stop reason). It should not be wiped between runs.

   Add safety rule for the agent in prompts/prompt.md
   Finalize harness.md to make it clear to a grader who the system works including: 
   Model fields in models.py and why they were chosen
   Tools and abilities
   Safety rules
   Specs (loop limits, result caps, models, how to run front and back end)

### Why a Second Prompt Was Needed

The first prompt built the audit trail, which was only verified offline against a scratch file because no live run was requested, so output/audit_trail.json was still an empty array. The second prompt asked for normal shopper activity on the live site to populate it.

### Additional Prompts

2. Run some activity as a normal user would to add to the audit_trail.json

   Timestamp: 2026-09-28 23:05:28 EDT

## Problem 13: Push to GitHub and submit the URL

**First prompt timestamp:** 2026-09-28 23:16:28 EDT  
*This timestamp is proof that I worked on one problem at a time and that there was human input each time.*

### Prompts Typed

1. Put the code in a folder named hw4 and push it to a public GitHub repo. I will be submitting the repo URL so that the graders can open and clone

   The gh repo should not include the real .env, campus_customs.db or product images (using .gitignore). Include .env.example with placeholders.

   The file structure should be the following:

   hw4/

   AI_prompts.md
   requirements.txt
   .env.example
   .gitignore
   README.md
   frontend/ (with all the Vite React TypeScript app)
   backend/
   main.py
   agent.py
   models.py
   tools.py
   backend/prompts/prompt.md
   output/
   harness.md
   design.md
   usability.md
   audit_trail.json
   app_check.html
   output/app_check_images/ (with the screenshots linked to app_check.html)

   data/ (not in git, local only)
   campus_customs.db
   data/products/
   README.md explains how to run the front end and back end after placing the data pack

### Why a Second Prompt Was Needed

The first prompt created and pushed the repository. The second prompt asked for confirmation that the repository is public, since graders must be able to open and clone it without access.

### Additional Prompts

2. To confirm that this is a public repo?

   Timestamp: 2026-09-28 23:22:54 EDT
