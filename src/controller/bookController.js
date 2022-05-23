const bookModel = require("../model/bookModel");
const validator = require("../validators/validator");
const reviewModel = require("../model/reviewModel");
const userModel = require("../model/userModel");
const aws = require('aws-sdk')

aws.config.update({
  accessKeyId: "AKIAY3L35MCRVFM24Q7U",
  secretAccessKey: "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",
  region: "ap-south-1"
})

let uploadFile= async ( file ) =>{
 return new Promise( function(resolve, reject) {
  // this function will upload file to aws and return the link
  let s3= new aws.S3({apiVersion: '2006-03-01'}); // we will be using the s3 service of aws

  var uploadParams= {
      ACL: "public-read",
      Bucket: "classroom-training-bucket",  //HERE
      Key: "abc/" + file.originalname, //HERE 
      Body: file.buffer
  }


  s3.upload( uploadParams, function (err, data ){
      if(err) {
          return reject({"error": err})
      }
      console.log(data)
      console.log("file uploaded succesfully")
      return resolve(data.Location)
  })

 })
}

const createBook = async function (req, res) {
  try {
    const bookData = req.body;
    const files = req.files
        
    if (!validator.isValidRequestBody(bookData)) {
      return res.status(400).send({ status: false, msg: "pls add details" });
    }
    console.log(bookData)
    let { title, excerpt, userId, ISBN, category, subcategory, releasedAt } = bookData;

    console.log(title)
    if (!validator.isValid(title)) {
      return res.status(400).send({ status: false, msg: "pls add tittle" });
    }
    if (!validator.isValid(excerpt)) {
      return res.status(400).send({ status: false, msg: "pls add excerpt" });
    }
    if (!validator.isValid(category)) {
      return res.status(400).send({ status: false, msg: "pls add category" });
    }
    if (!validator.isValid(subcategory)) {
      return res
        .status(400)
        .send({ status: false, msg: "pls add subcategory" });
    }
    if (!validator.isValid(ISBN)) {
      return res.status(400).send({ status: false, msg: "pls add ISBN" });
    }

    if (!validator.isValid(userId)) {
      return res.status(400).send({ status: false, msg: "Userid is required" });
    }
    if (!validator.isValidObjectId(userId)) {
      return res.status(400).send({ status: false, msg: "invalid userId" });
    }

    const isUserIdExist = await userModel.findById(userId)
    if(!isUserIdExist){
      return res.status(400).send({status: false, message: "User Id doesn't exist."})
    }

    // ISBN validation using regex
    if (!/^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/.test(ISBN))
      return res.status(400).send({ status: false, msg: "ISBN is invalid" });
    // excerpt validation using regex

    if (!/^[0-9a-zA-Z,\-.\s:;]+$/.test(excerpt))
      return res.status(400).send({ status: false, msg: "excerpt is invalid" });

    const sameISBN = await bookModel.findOne({ ISBN: ISBN, isDeleted: false });
    if (sameISBN)
      return res
        .status(400)
        .send({ status: false, msg: `${ISBN} already exists` });

    const sameTitle = await bookModel.findOne({
      title: title,
      isDeleted: false,
    });
    if (sameTitle)
      return res
        .status(400)
        .send({ status: false, msg: `${title} already exists` });

    if (!validator.isValid(releasedAt)) {
      return res
        .status(400)
        .send({ status: false, message: "Date of release is required." });
    }

    if(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/.test(Date(releasedAt))){
      return res.status(400).send({status: false, messagae: "Date is Invalid."})
    }
    //Authorization

    if (req["decodedToken"].userId != userId) {
      return res
        .status(403)
        .send({ status: false, message: "You are not authorized" });
    }

    if(!(files && files.length>0)){
      return res.status(400).send({ msg: "No file found" })
    }
    let uploadedFileURL= await uploadFile( files[0] )

    let object = {
      title,
      excerpt,
      ISBN,
      category,
      subcategory,
      userId,
      releasedAt,
      bookCover: uploadedFileURL
    };

    const books = await bookModel.create(object);
    return res
      .status(201)
      .send({ status: true, message: "success", data: books });

  } 
  catch (error) {
    console.log(error);
    return res.status(500).send({ status: false, message: error.message });
  }
};



const getBooks = async function (req, res) {
  try {

    let filters = { isDeleted: false };
    
    if(validator.isValidRequestBody(req.query)){

      const {userId, category, subcategory} = req.query
      if(validator.isValid(userId) && validator.isValidObjectId(userId)){
        filters['userId'] = userId
      }
      if(validator.isValid(category)){
        filters['category ']= category
      }
      if(validator.isValid(subcategory)){
        filters['subcategory'] = subcategory
      }
    }
    

    let bookData = await bookModel.find(filters).sort({title: 1}).select({
      _id: 1,
      title: 1,
      excerpt: 1,
      userId: 1,
      category: 1,
      reviews: 1,
      releasedAt: 1,
    });                                           

    if (bookData.length > 0) {
      return res.status(200).send({
        status: true,
        message: "Book List",
        data: bookData,
      });
    } else {
      return res.status(404).send({ status: false, msg: "No books found" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: false, msg: error.message });
  }
};




const getbookbyId = async function (req, res) {
  try {
    let Id = req.params.bookId;
    if (!validator.isValid(Id)) {
      return res
        .status(400)
        .send({ status: false, msg: "pls provide the book id" });
    }
    if (!validator.isValidObjectId(Id)) {
      return res
        .status(400)
        .send({ status: false, msg: "pls provide valid bookId" });
    }

    let findId = await bookModel.findOne({ _id: Id, isDeleted: false }); 
    if (!findId) {
      return res.status(400).send({ status: false, msg: "book not found" });
    }
    
    const reviewArr = await reviewModel.find({bookId: Id, isDeleted: false}, {bookId:1, reviewedBy:1, reviewedAt:1, rating:1, review:1})
    const finalObj = findId.toJSON() //we can also use toString() in place of toJSON(): Actully we are getting mongoose obj in findId so we have to convert it to js obj to add another key.
    finalObj["reviewsData"] = reviewArr
    
    return res.status(200).send({status: true, message: "Success", Data: finalObj})

  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: false, msg: error.message });
  }
};


const updateBook = async function (req, res) {
  try {
    const bookId = req.params.bookId;

    if (!validator.isValid(bookId)) {
      return res
        .status(400)
        .send({ status: false, msg: "pls provide the book id" });
    }
    if (!validator.isValidObjectId(bookId)) {
      return res
        .status(400)
        .send({ status: false, msg: "please provide the valid book id" });
    }

    // Checking if book exist or not in our DB.
    const isBookExist = await bookModel.findOne({
      _id: bookId,
      isDeleted: false,
    });

    if (!isBookExist) {
      return res
        .status(404)
        .send({ status: false, message: "Requested Book is not present." });
    }

    //checking Authorization
    if (req["decodedToken"].userId != isBookExist.userId) {
      return res
        .status(403)
        .send({ status: false, message: "You are not authorized." });
    }

    const data = req.body;
    const { title, excerpt, releasedAt, ISBN } = data;

    // Some validations
    if (!validator.isValid(title)) {
      return res
        .status(400)
        .send({ status: false, message: "title is required" });
    }
    if (!validator.isValid(excerpt)) {
      return res
        .status(400)
        .send({ status: false, message: "excerpt is required" });
    }
    if (!validator.isValid(releasedAt)) {
      return res
        .status(400)
        .send({ status: false, message: "releasedAt is required" });
    }
    if (!validator.isValid(ISBN)) {
      return res
        .status(400)
        .send({ status: false, message: "ISBN is required" });
    }
    if (!/^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/.test(ISBN)) {
      return res.status(400).send({ status: false, msg: "ISBN is invalid" });
    }

    const sameISBN = await bookModel.findOne({ ISBN: ISBN, isDeleted: false });
    if (sameISBN)
      return res
        .status(400)
        .send({ status: false, msg: `${ISBN} already exists` });

    const sameTitle = await bookModel.findOne({
      title: title,
      isDeleted: false,
    });
    if (sameTitle)
      return res
        .status(400)
        .send({ status: false, msg: `${title} already exists` });

    //Updating the given data...
    const savedData = await bookModel.findByIdAndUpdate(
      { _id: bookId, isDeleted: false },
      { $set: data },
      { new: true }
    );

    return res
      .status(200)
      .send({ status: true, message: "Success", Data: savedData });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: false, msg: error.message });
  }
};


const deleteBook = async function (req, res) {
  try {
    let bookId = req.params.bookId;
    if (!validator.isValid(bookId)) {
      return res
        .status(400)
        .send({ status: false, msg: "pls provide the book id" });
    }
    if (!validator.isValidObjectId(bookId)) {
      return res
        .status(400)
        .send({ status: false, msg: "please provide the valid book id" });
    }

    // Book is present or not in DB.
    let findBook = await bookModel.findOne({ _id: bookId, isDeleted: false });
    if (!findBook) {
      return res
        .status(400)
        .send({ status: false, msg: "there is no book present" });
    }

    //Authorization check 176 - 183

    const docUserId = findBook.userId;
    const requestedUser = req["decodedToken"].userId;

    if (docUserId != requestedUser) {
      return res
        .status(403)
        .send({ status: false, msg: "You are not authorized" });
    }

    let deleteBook = await bookModel.findByIdAndUpdate(
      { _id: bookId, isDeleted: false },
      { isDeleted: true, deletedAt: Date.now() },
      { new: true }
    );
    if (!deleteBook) {
      return res
        .status(400)
        .send({ status: false, msg: "Book already deleted" });
    } else {
      return res.status(200).send({
        status: false,
        msg: "Book deleted successfully",
        data: deleteBook,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: false, msg: error.message });
  }
};


module.exports = { createBook, getBooks, getbookbyId, updateBook, deleteBook };
