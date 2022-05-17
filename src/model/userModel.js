const mongoose=require('mongoose')
 const userSchema=new mongoose.Schema({



    title: {type:String,required:true, enum:['Mr', 'Mrs','Miss'],trim:true},
    name: {type:String,required:true,trim:true},
    phone: {
            type:Number,
            unique:true,
            required:true,
    },
    email: {
       type: String,
       trim: true,
       lowercase: true,
       unique: true,
       required:true
    }, 
    password: { type: String,
         trim: true,
         required:true, 
         minLength: 8,
         maxLength: 15
         },
    address: {
      street: {type:String},
      city: {type:String},
      pincode: {type:String}
    }, 

}, { timestamps: true });


module.exports=mongoose.model("User",userSchema)