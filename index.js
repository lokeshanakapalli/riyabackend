const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Use bcryptjs instead of bcrypt
const app = express();

// Enable CORS for all routes and use dotenv
app.use(cors());
dotenv.config();
app.use(express.json()); // To parse JSON request bodies

const port = process.env.PORT || 5000;

// Database connection setup
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to database');
});


// Route to fetch all admins (for debugging or general admin info, if needed)
app.get('/api/admin', (req, res) => {
  db.query('SELECT * FROM admin', (err, results) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(results);
    }
  });
});

// Distributor Login route
app.post('/api/distributor/login', (req, res) => {
  const { email, password } = req.body;

  // Find distributor by email in MySQL
  db.query('SELECT * FROM distributor_profiles WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Server error. Please try again later.' });
    }

    // Check if distributor exists
    if (results.length === 0) {
      return res.status(404).json({ message: 'Distributor not found' });
    }

    const distributor = results[0]; // Get the first result

    // Validate password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, distributor.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Send back the distributor ID and success message
    res.status(200).json({ message: 'Login successful', id: distributor.id });
  });
});

// Login route for admin authentication
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;

  // Find admin by email in MySQL
  db.query('SELECT * FROM admin WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Server error. Please try again later.' });
    }

    // Check if admin exists
    if (results.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const admin = results[0]; // Get the first result (should be only one)

    // Validate password with bcryptjs
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Respond with success if password is valid
    res.status(200).json({ message: 'Login successful' });
  });
});


// Login route for admin authentication
app.post('/api/bureaulogin', (req, res) => {
  const { email, password } = req.body;

  // Find admin by email in MySQL
  db.query('SELECT * FROM bureau_profiles WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Server error. Please try again later.' });
    }

    // Check if Bureau exists
    if (results.length === 0) {
      return res.status(404).json({ message: 'Bureau not found' });
    }

    const bureau = results[0]; // Get the first result (should be only one)

    // Validate password with bcryptjs
    const isPasswordValid = await bcrypt.compare(password, bureau.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Respond with success if password is valid
    res.status(200).json({ message: 'Login successful', id: bureau.bureauId });
  });
});


// Endpoint to get bureau profiles by distributor ID
app.get('/api/bureau_profiles_distributer', (req, res) => {
  const distributorId = req.query.distributorId;

  // Check if distributorId is provided
  if (!distributorId) {
    return res.status(400).json({ message: 'Distributor ID is required' });
  }

  // Query to get bureau profiles for the specified distributor ID
  const query = 'SELECT * FROM bureau_profiles WHERE distributorId = ?';
  db.query(query, [distributorId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Server error. Please try again later.' });
    }

    // Respond with the results
    res.status(200).json({ bureauProfiles: results });
  });
});



// Endpoint to get bureau profiles by distributor ID
app.get('/api/bureau_profiles_bureauId', (req, res) => {
  const bureauId = req.query.bureauId;

  // Check if distributorId is provided
  if (!bureauId) {
    return res.status(400).json({ message: 'bureauId is required' });
  }

  // Query to get bureau profiles for the specified distributor ID
  const query = 'SELECT * FROM bureau_profiles WHERE bureauId = ?';
  db.query(query, [bureauId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Server error. Please try again later.' });
    }

    // Respond with the results
    res.status(200).json({ bureauProfiles: results });
  });
});

// Endpoint to get all bureau profiles
app.get('/api/bureau_profiles', (req, res) => {
  // Query to get all records from the bureau_profiles table
  db.query('SELECT * FROM bureau_profiles', (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Server error. Please try again later.' });
    }

    // Respond with the results
    res.status(200).json({ bureauProfiles: results });
  });
});

// Endpoint to get all distributor profiles
app.get('/api/distributors', (req, res) => {
  // Query to get all records from the distributor_profiles table
  db.query('SELECT * FROM distributor_profiles', (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Server error. Please try again later.' });
    }

    // Respond with the results
    res.status(200).json({ distributors: results });
  });
});
// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Specify the uploads directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Use timestamp + original filename
  },
});
const upload = multer({ storage });

// Create distributor route
app.post('/api/distributor/create', upload.array('documents', 10), async (req, res) => {
  const { fullName, email, mobileNumber, password, createdAt, location, paymentStatus, companyName } = req.body;
  const documentFiles = req.files; // Access uploaded files

  if (!fullName || !email || !mobileNumber || !password || !companyName) {
    return res.status(400).json({ message: 'Please fill all required fields.' });
  }

  try {
    const checkQuery = 'SELECT * FROM distributor_profiles WHERE email = ? OR mobileNumber = ?';
    db.query(checkQuery, [email, mobileNumber], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
      }

      if (results.length > 0) {
        return res.status(409).json({ message: 'Distributor already exists with this email or mobile number.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const insertQuery = 
        'INSERT INTO distributor_profiles (fullName, email, mobileNumber, password, createdAt, location, paymentStatus, companyName) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      const values = [
        fullName,
        email,
        mobileNumber,
        hashedPassword,
        createdAt || new Date(),
        location,
        paymentStatus,
        companyName,
      ];

      db.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Server error. Please try again later.' });
        }

        // Store document file paths in the database if necessary
        if (documentFiles && documentFiles.length > 0) {
          documentFiles.forEach((file) => {
            const filePathQuery = 'INSERT INTO distributor_documents (distributor_id, file_path) VALUES (?, ?)';
            db.query(filePathQuery, [result.insertId, file.path], (err) => {
              if (err) {
                console.error('Error saving file path:', err);
              }
            });
          });
        }

        res.status(201).json({ message: 'Distributor created successfully' });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});




// Create bureau route with document uploads, unique bureauId, and password hashing
app.post('/api/bureau/create', upload.array('documents', 10), async (req, res) => {
  const { bureauName, mobileNumber, about, location, email, ownerName, paymentStatus, distributorId, password } = req.body;
  const documentFiles = req.files; // Access uploaded files

  // Check if the required fields are present
  if (!bureauName || !email || !mobileNumber || !ownerName || !distributorId || !password) {
    return res.status(400).json({ message: 'Please fill all required fields.' });
  }

  // Generate a 7-digit unique bureauId
  const generateBureauId = () => {
    const randomNum = Math.floor(1000000 + Math.random() * 9000000); // Generate a 7-digit random number
    return randomNum.toString();
  };

  const bureauId = generateBureauId(); // Generate the unique bureau ID

  try {
    // Check if a bureau already exists with the same email or mobile number
    const checkQuery = 'SELECT * FROM bureau_profiles WHERE email = ? OR mobileNumber = ?';
    db.query(checkQuery, [email, mobileNumber], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
      }

      if (results.length > 0) {
        return res.status(409).json({ message: 'Bureau already exists with this email or mobile number.' });
      }

      // Hash the password before saving to the database using bcryptjs
      bcrypt.hash(password, 10, (err, hashedPassword) => {  // saltRounds is 10
        if (err) {
          console.error('Error hashing password:', err);
          return res.status(500).json({ message: 'Error hashing password.' });
        }

        // Insert the bureau profile into the database with the generated bureauId and hashed password
        const insertQuery =
          'INSERT INTO bureau_profiles (bureauId, bureauName, mobileNumber, about, location, email, ownerName, paymentStatus, distributorId, password, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [
          bureauId,
          bureauName,
          mobileNumber,
          about,
          location,
          email,
          ownerName,
          paymentStatus,
          distributorId,
          hashedPassword, // Save hashed password
          new Date(), // Created at with current timestamp
        ];

        db.query(insertQuery, values, (err, result) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Server error. Please try again later.' });
          }

          // If document files were uploaded, store their file paths in the database
          if (documentFiles && documentFiles.length > 0) {
            documentFiles.forEach((file) => {
              const filePathQuery = 'INSERT INTO bureau_documents (bureau_id, file_path) VALUES (?, ?)';
              db.query(filePathQuery, [result.insertId, file.path], (err) => {
                if (err) {
                  console.error('Error saving file path:', err);
                }
              });
            });
          }

          // Respond with success message
          res.status(201).json({ message: 'Bureau created successfully', bureauId: bureauId });
        });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});




// API endpoint for updating bureau profile
app.put('/api/bureau/update', async (req, res) => {
  const { bureauId, bureauName, mobileNumber, about, location } = req.body;

  if (!bureauId || (!bureauName && !mobileNumber && !about && !location)) {
    return res.status(400).json({ message: 'Please provide bureauId and at least one field to update.' });
  }

  try {
    const updates = [];
    const values = [];

    // Add conditions for updating each field
    if (bureauName) {
      updates.push('bureauName = ?');
      values.push(bureauName);
    }
    if (mobileNumber) {
      updates.push('mobileNumber = ?');
      values.push(mobileNumber);
    }
    if (about) {
      updates.push('about = ?');
      values.push(about);
    }
    if (location) {
      updates.push('location = ?');
      values.push(location);
    }

    values.push(bureauId); // Ensure bureauId is at the end for the WHERE clause

    const updateQuery = `UPDATE bureau_profiles SET ${updates.join(', ')} WHERE bureauId = ?`;

    // Execute the update query
    db.query(updateQuery, values, (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Bureau not found.' });
      }

      res.status(200).json({ message: 'Bureau updated successfully' });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});



// Website Updates 

// New multer setup for `homebanners` folder
const homeBannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'homebanners/'); // Save in `homebanners` directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const uploadHomeBanner = multer({ storage: homeBannerStorage });

// New API endpoint for uploading bureau images
app.put('/api/bureau/uploadBanner', uploadHomeBanner.single('image'), async (req, res) => {
      console.log("BureauId:", req.body.bureauId);  // Log bureauId
  console.log("File:", req.file);   
  const { bureauId } = req.body;

  if (!bureauId || !req.file) {
  return res.status(400).json({ message: 'Please provide bureauId and an image to upload.' });
}


  const imageUrl = `/homebanners/${req.file.filename}`; // Path to the saved image

  try {
    const updateQuery = 'UPDATE bureau_profiles SET welcomeImageBanner = ? WHERE bureauId = ?';
    const values = [imageUrl, bureauId];

    db.query(updateQuery, values, (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Bureau not found.' });
      }

      res.status(200).json({ message: 'Image uploaded successfully', imageUrl });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});



// Storage configuration for multer to save images in the 'bannerimages' directory
const bannerImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'bannerimages/'); // Save images in 'bannerimages' directory
  },
  filename: (req, file, cb) => {
    const fileName = Date.now() + '-' + file.originalname;
    cb(null, fileName); // Rename the file with a timestamp to avoid conflicts
  },
});

// Set up multer to handle file uploads
const uploadBannerImages = multer({ storage: bannerImageStorage });

// API endpoint to upload a single banner image
app.post('/api/bureau/slider', uploadBannerImages.single('image'), async (req, res) => {
  const { bureauId } = req.body;

  if (!bureauId || !req.file) {
    return res.status(400).json({ message: 'Please provide bureauId and an image to upload.' });
  }

  // Collect the URL of the uploaded image
  const imageUrl = `/bannerimages/${req.file.filename}`; // Image path in the folder

  try {
    // Insert the image URL into the slider_images table
    const insertQuery = 'INSERT INTO slider_images (bureauId, imageUrl) VALUES (?, ?)';
    const values = [bureauId, imageUrl];

    db.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
      }

      // Check if the row was inserted successfully
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Bureau not found or image could not be inserted.' });
      }

      res.status(200).json({
        message: 'Image uploaded and inserted into slider_images table successfully.',
        imageUrl,
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});


// API endpoint to fetch all banner images for a bureau
app.get('/api/bureau/getBannerImages', async (req, res) => {
  const { bureauId } = req.query;

  if (!bureauId) {
    return res.status(400).json({ message: 'Please provide bureauId.' });
  }

  try {
    // Query to get all banner images for a specific bureau
    const selectQuery = 'SELECT imageUrl, id FROM slider_images WHERE bureauId = ?';
    const values = [bureauId];

    db.query(selectQuery, values, (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
      }

      // Check if images exist for the bureau
      if (result.length === 0) {
        return res.status(404).json({ message: 'No images found for the given bureau.' });
      }

      // Respond with the image URLs
      res.status(200).json({
        message: 'Banner images fetched successfully.',
        bannerImages: result,
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// API endpoint to delete a banner image for a bureau
app.delete('/api/deleteBannerImage/:imageId', async (req, res) => {
  const { imageId } = req.params;

  if (!imageId) {
    return res.status(400).json({ message: 'Please provide imageId.' });
  }

  try {
    // Query to delete the image from the database
    const deleteQuery = 'DELETE FROM slider_images WHERE id = ?';
    const values = [imageId];

    db.query(deleteQuery, values, (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
      }

      // Check if the image was deleted
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Image not found.' });
      }

      // Respond with success message
      res.status(200).json({ message: 'Image deleted successfully.' });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});


const galleryImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'galleryimages/'); // Save images in 'galleryimages' directory
  },
  filename: (req, file, cb) => {
    const fileName = Date.now() + '-' + file.originalname;
    cb(null, fileName); // Rename the file with a timestamp to avoid conflicts
  },
});

// Set up multer to handle gallery image uploads
const uploadGalleryImages = multer({ storage: galleryImageStorage });

// API endpoint to upload a single gallery image
app.post('/api/gallery/upload', uploadGalleryImages.single('image'), async (req, res) => {
  const { bureauId } = req.body;

  if (!bureauId || !req.file) {
    return res.status(400).json({ message: 'Please provide bureauId and an image to upload.' });
  }

  // Collect the URL of the uploaded image
  const imageUrl = `/galleryimages/${req.file.filename}`; // Image path in the folder

  try {
    // Insert the image URL into the gallery_images table
    const insertQuery = 'INSERT INTO gallery_images (bureauId, imageUrl) VALUES (?, ?)';
    const values = [bureauId, imageUrl];

    db.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
      }

      // Check if the row was inserted successfully
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Bureau not found or image could not be inserted.' });
      }

      res.status(200).json({
        message: 'Image uploaded and inserted into gallery_images table successfully.',
        imageUrl,
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// API endpoint to fetch all gallery images for a bureau
app.get('/api/gallery/getImages', async (req, res) => {
  const { bureauId } = req.query;

  if (!bureauId) {
    return res.status(400).json({ message: 'Please provide bureauId.' });
  }

  try {
    // Query to get all gallery images for a specific bureau
    const selectQuery = 'SELECT imageUrl, id FROM gallery_images WHERE bureauId = ?';
    const values = [bureauId];

    db.query(selectQuery, values, (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
      }

      // Check if images exist for the bureau
      if (result.length === 0) {
        return res.status(404).json({ message: 'No images found for the given bureau.' });
      }

      // Respond with the image URLs
      res.status(200).json({
        message: 'Gallery images fetched successfully.',
        galleryImages: result,
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// API endpoint to delete a gallery image for a bureau
app.delete('/api/deleteGalleryImage/:imageId', async (req, res) => {
  const { imageId } = req.params;

  if (!imageId) {
    return res.status(400).json({ message: 'Please provide imageId.' });
  }

  try {
    // Query to delete the image from the database
    const deleteQuery = 'DELETE FROM gallery_images WHERE id = ?';
    const values = [imageId];

    db.query(deleteQuery, values, (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
      }

      // Check if the image was deleted
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Image not found.' });
      }

      // Respond with success message
      res.status(200).json({ message: 'Image deleted successfully.' });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
