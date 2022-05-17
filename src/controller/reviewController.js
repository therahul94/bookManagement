const bookModel = require('../model/bookModel');
const reviewModel = require('../model/reviewModel')
const validator = require('../validators/validator')
const moment = require('moment')


const addReview = async function(req, res){   
    try{
        const bookId = req.params.bookId
        const requestedBody = req.body

        if(!validator.isValid(bookId)){
            return res.status(400).send({status: false, message: "Pls provide bookId"})
        }
        if(!validator.isValidObjectId(bookId)){
            return res.status(400).send({status: false, message: "BookId is Invalid"})
        }
        const {review, rating, reviewedBy} = requestedBody
        if(!validator.isValid(review)){
            return res.status(400).send({status: false, message: "pls fill the review section."})
        }
        if(!validator.isValid(rating)){
            return res.status(400).send({status: false, message: "pls fill the rating section."})
        }
        if(!validator.isValid(reviewedBy)){
            return res.status(400).send({status: false, message: "pls provide the reviewer's name."})
        }

        if(!/^[1-5]{1}$/.test(rating)){
            return res
            .status(400)
            .send({ status: false, msg: "rating should be a number only" });
        }

        const filter = {isDeleted: false, _id: bookId}
        const findBook = await bookModel.findOne(filter)
        if(!findBook){
            return res.status(404).send({status: false, message: "Requested book is not present"})
        }
        requestedBody.bookId = bookId
        requestedBody.reviewedAt = moment().format('YYYY-MM-DD')

        const savedData = await reviewModel.create(requestedBody)
        
        const bookDetailsWithReview = await bookModel.findOneAndUpdate({_id: bookId}, {$inc: {reviews: 1} }, {new: true})
        console.log(bookDetailsWithReview)

        const displayData = await reviewModel.findOne({_id: savedData._id},{_id:1,bookId:1, reviewedBy:1, reviewedAt:1, rating:1, review:1})
        const finalData = findBook.toObject()
        finalData['reviewsData'] = displayData

        return res.status(201).send({status: true, message: 'Success', Data: finalData})
        
    }
    catch(error){
        console.log(error)
        return res.status(500).send({status: false, message: error.message})
    }


}



const updateReview = async function (req, res) {



    try {

        const bookParams = req.params.bookId
        const reviewParams = req.params.reviewId
        const requestupadtedBody = req.body


        const { review, rating, reviewedBy } = requestupadtedBody
        // validation starts


        if (!validator.isValidObjectId(bookParams)) {
            return res.status(400).send({ status: false, msg: "Pls provide valid bookId" })
        }
        if (!validator.isValidObjectId(reviewParams)) {
            return res.status(400).send({ status: false, msg: "invalid reviewId" })
        }

        if (!validator.isValid(rating)) {
            return res.status(400).send({ status: false, msg: "Rating is required" })
        }

        if (!/^[1-5]{1}$/.test(rating)) {
            return res.status(400).send({ status: false, msg: "rating must be between 1 to 5" })
        }

        if (!validator.isValid(review)) {
            return res.status(400).send({ status: false, msg: "review is missing , pls provide review to update" })
        }

        if (!validator.isValid(reviewedBy)) {
            return res.status(400).send({ status: false, msg: "reviewer's name  is missing , pls provide review to update" })
        }


        const searchBook = await bookModel.findById({ _id: bookParams, isDeleted: false  })
        if (!searchBook) {
            return res.status(400).send({ status: false, msg: `${bookParams} book is not present` })
        }
        const searchReview = await reviewModel.findById({ _id: reviewParams, isDeleted: false })
        if (!searchReview) {
            return res.status(400).send({ status: false, msg: `${reviewParams} review is not present` })
        }

        const updateReviewDetails = await reviewModel.findOneAndUpdate({ _id: reviewParams }, { review: review, rating: rating, reviewedBy: reviewedBy }, { new: true })
        const finalData = searchBook.toObject()
        finalData['reviewsData'] = updateReviewDetails
        return res.status(200).send({ status: true, msg: "success", data: finalData })
   

    }
    catch (error) {
        console.log(error)
        res.status(500).send({ status: false, msg: error.message })
    }
}


//{_id:ObjectId('627c09b1516b401ca8c48f14')}
// {_id:ObjectId('627e5c8b89b199a1e4c5c519')}

const deleteReview = async function(req, res){
    try{
        const bookId = req.params.bookId
        const reviewId = req.params.reviewId
        if(!validator.isValidObjectId(reviewId)){
            return res.status(400).send({status: false, message: "Not a valid reviewid"})
        }
        if(!validator.isValidObjectId(bookId)){
            return res.status(400).send({status: false, message: "Not a valid bookid"})
        }

        const reviewExist = await reviewModel.findOne({_id: reviewId, isDeleted: false})
        if(!reviewExist){
            return res.status(404).send({status: false, message: "review is not present"})
        }
        const bookExist = await bookModel.findOne({_id: bookId, isDeleted: false})
        if(!bookExist){
            return res.status(404).send({status: false, message: "book is not present"})
        }

        await reviewModel.findOneAndUpdate(
            {_id: reviewId, isDeleted: false}, 
            {isDeleted: true, deletedAt: Date.now()}
        )

        bookExist.reviews = bookExist.reviews === 0 ? 0 : bookExist.reviews-1
        await bookExist.save()
        
        return res.status(200).send({status: true, message: "Success"})
    }
    catch(error){
        console.log(error)
        return res.status(500).send({status: false, message: error.message})
    }


}

module.exports = {addReview, updateReview, deleteReview}