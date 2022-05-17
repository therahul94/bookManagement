const express=require('express')
const router=express.Router()
const User=require('../controller/userController')
const {createBook, getBooks, deleteBook, updateBook, getbookbyId} = require('../controller/bookController')
const {addReview, updateReview, deleteReview} = require('../controller/reviewController')
const auth1 = require('../middlewares/Auth')

//API's for User
router.post('/register',User.createUser)
router.post('/login',User.userLogin)

//Books related API's
router.post('/books',auth1.auth,createBook)
router.get('/books',auth1.auth,getBooks)
router.get('/books/:bookId',auth1.auth, getbookbyId)
router.put('/books/:bookId', auth1.auth, updateBook)
router.delete('/books/:bookId',auth1.auth, deleteBook)


//API's for review
router.post('/books/:bookId/review', addReview)
router.put('/books/:bookId/review/:reviewId', updateReview)
router.delete('/books/:bookId/review/:reviewId',deleteReview)



module.exports=router