const express = require('express');
const router = express.Router();

const clientId = process.env.API_CLIENT_ID;
const clientSecret = process.env.API_CLIENT_SECRET;
const redirectUri = process.env.API_REDIRECT_CALLBACK;
const authorizationCode = process.env.API_CODE;

async function getTokens() {
  try {


console.log(`Starting fetch with : ${clientId}  and authCode= ${authorizationCode}...`)

    const response = await fetch('https://auth-global.api.smartthings.com/oauth/token', {
      method: "POST",
      body: {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: authorizationCode,
        redirect_uri: redirectUri
      }
    });
    console.log(response.data)
    // const { access_token, refresh_token, expires_in } = response.data;
    // console.log('Access Token:', access_token);
    // console.log('Refresh Token:', refresh_token);
    // console.log('Expires In:', expires_in);

    // return { access_token, refresh_token, expires_in };

  } catch (err) {
    console.error('Failed to get tokens:', err.response?.data || err.message);
  }
}






const initializeData = {
    "configurationData": {
      "initialize": {
        "name": "On When Open\/Off When Shut WebHook App",
        "description": "On When Open\/Off When Shut WebHook App",
        "id": "app",
        "permissions": [],
        "firstPageId": "1"
      }
    }
  }

router.get('/', async (req, res) => {
  console.log("starting Token generation ")

    const resp = await getTokens()


    res.send(resp)
})

router.post('/target', async (req, res) => {
  console.log("target...", req.body)
  
  if (req.body.messageType === "CONFIRMATION") {

      const result = await fetch(req.body.confirmationData.confirmationUrl)
      
      console.log(result)

    } 

  else if (req.body.lifecycle === "CONFIGURATION") {
  
   if (req.body.configurationData.phase === "INITIALIZE") 
        { 
          console.log("PHASE : INITIALIZE")
          console.log(req.body)
            //mconst result = await fetch(req.body.confirmationData.confirmationUrl)
            // console.log("Received Configuration ... Sending Initialize Data...")
            // res.send(initializeData)}
        }
    }
    else {
      console.log("no route ... ")
      console.log(req.body)
    }
  
  });

  router.post('/auth', async (req, res) => {
    console.log("auth", req.body)
    
    if (req.body.lifecycle === "CONFIRMATION") {
  
        const result = await fetch(req.body.confirmationData.confirmationUrl)
        console.log(result)
    } 
    else if (req.body.lifecycle === "CONFIGURATION") {
    
     if (req.body.configurationData.phase === "INITIALIZE") 
          { 
            console.log("PHASE : INITIALIZE")
            console.log(req.body)
              //mconst result = await fetch(req.body.confirmationData.confirmationUrl)
              // console.log("Received Configuration ... Sending Initialize Data...")
              // res.send(initializeData)}
          }
      }
      else {
        console.log("no route ... ")
        console.log(req.body)
      }
    
    });

router.post('/code', async (req, res) => {
if (req.body.lifecycle === "CONFIRMATION") {

    const result = await fetch(req.body.confirmationData.confirmationUrl)
    console.log(result)
} 
else if (req.body.lifecycle === "CONFIGURATION") {

 if (req.body.configurationData.phase === "INITIALIZE") 
      { 
        console.log("PHASE : INITIALIZE")
        console.log(req.body)
          //mconst result = await fetch(req.body.confirmationData.confirmationUrl)
          // console.log("Received Configuration ... Sending Initialize Data...")
          // res.send(initializeData)}
      }
  }
  else {
    console.log("no route ... ")
    console.log(req.body)
  }

});



module.exports = router;





