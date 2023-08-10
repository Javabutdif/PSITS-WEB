const {SHA512} = require('../utils/ServerUtils');
const AuthToken = require('../classes/AuthToken');
const User = require('../models/UserModel');

const TOKENS = [];

async function GetUserPassMiddleware(req, res, next) {
    // get the user_id and password from the header
    const user_id = req.headers.user_id;
    const password = req.headers.password;

    // return bad-request if these fields are missing
    if(!user_id)
        return res.status(400).json({message: "User_ID must be present at the header of the request!", StatusCode: 400 });
    if(!password)
        return res.status(400).json({message: "Password must be present at the header of the request!", StatusCode: 400 });

    // database lookup
    try{
        const user = await User.findOne({user_id, password: await SHA512(password)});

        // return unauthorized when user is not found
        if(!user)
            return res.status(401).json({message: "Unauthorized", StatusCode: 401 });
        res.issuer = user.user_id;
    }catch(error){
        // return server-error when error occurs
        return res.status(500).json({message: "Internal server error! "+error.message, StatusCode: 500 });
    }

    // proceed to the next middleware [if there is any]
    next();
}

function GenerateToken(req, res, next) {
    // generate a new token
    const token = new AuthToken(res.issuer);

    // remove old token associated with the issuer
    const filtered = TOKENS.filter(t => t.issuer !== token.issuer);
    for(let i = 0; i < TOKENS.length; i++)
        TOKENS.pop();

    // update the array
    TOKENS.push(...filtered, token);

    res.AuthToken = token;
    next();
}

/**
 * This middleware function will check for the `AuthToken` at the 
 * {@link Request} header. This function will run asynchronously since it
 * will do some database lookup.
 * 
 * If AuthToken was not provided in the request header, this function will
 * return a `400 - bad request` response. If an AuthToken does not exists,
 * this function will return a `403 - Forbidden` response, otherwise, it will
 * bind the `AuthExpired`, `ExpireTime`, `issuer`, and `isAdmin` in the 
 * {@link Response} object.
 * 
 * @param {Request} req
 * @param {Response} res
 * @param {import('express').NextFunction} next
 * @returns {Response} the response
 * 
 * @example
 * expressRoute.get('/', GetAuthToken, (req, res) => {});
 */
async function GetAuthToken(req, res, next){
    // get the header
    const authToken = req.headers.authtoken;

    // if no token is in header, return bad-request
    if(!authToken)
        return res.status(400).json({message: "AuthToken must be provided at the request header!", StatusCode: 400});

    const foundToken = TOKENS.filter(token => token.AuthToken === authToken);

    // if no token was found, return a forbidden response
    if(foundToken.length === 0)
        return res.status(403).json({message: "AuthToken provided does not exists!", StatusCode: 403});

    // grab the token info and check if expired
    const dateNow = new Date();
    res.AuthExpired = new Date(foundToken[0].ExpirationDate) < dateNow.getTime();
    res.ExpireTime  = new Date(foundToken[0].ExpirationDate).getTime() - dateNow.getTime();
    
    // get the issuer id
    res.issuer = foundToken[0].issuer;
    const user = await User.findOne({user_id:res.issuer})
    //  get the user admin status
    res.isAdmin = user.isAdmin;

    next();
}



module.exports = {
    GetUserPassMiddleware: GetUserPassMiddleware,
    GenerateToken: GenerateToken,
    GetAuthToken : GetAuthToken
};