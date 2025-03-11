// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAQgO12nfWVqWtUz_hPhYoWp3GrbWrtSlk",
  authDomain: "e-commerce-project-bed88.firebaseapp.com",
  projectId: "e-commerce-project-bed88",
  storageBucket: "e-commerce-project-bed88.firebasestorage.app",
  messagingSenderId: "506905111695",
  appId: "1:506905111695:web:39b5f04b20087524df54fa",
  measurementId: "G-LBQX756N1R"
  };
  
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  let currentUser = null;
  let currentProductId = null; // To track the product being edited or deleted
  let allProducts = []; // Store all products for filtering
  let salesChart = null; // To store the Chart.js instance
  
  // Navigation function
  function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    if (sectionId === 'readProductsSection') loadProducts();
    if (sectionId === 'salesGraphSection') loadSalesGraph();
  }
  
  // Load Products
  // Load Products with Enhanced Low Stock Alert
  function loadProducts() {
    const productsListDiv = document.getElementById('productsList');
    productsListDiv.innerHTML = "Loading products...";
    
    db.collection('products').get()
      .then(snapshot => {
        productsListDiv.innerHTML = "";
        allProducts = []; // Reset the products array
        
        if (snapshot.empty) {
          productsListDiv.innerHTML = "No products available.";
          return;
        }
  
        let lowStockMessages = []; // Collect low stock messages for alert
        
        snapshot.forEach(doc => {
          const prod = doc.data();
          prod.id = doc.id;
          allProducts.push(prod); // Store the product data
          
          const imageUrl = prod.imageUrl || 'assets/images/nothing.png';
          const productDiv = document.createElement('div');
          productDiv.classList.add('product-item');
          productDiv.setAttribute('data-category', prod.category);
          productDiv.setAttribute('data-name', prod.name.toLowerCase());
          
          productDiv.innerHTML = `
            <img src="${imageUrl}" alt="${prod.name}" width="100" onerror="this.src='assets/images/nothing.png'"/>
            <div class="product-details">
              <strong class="product-name">${prod.name}</strong> - $${prod.price}
              <br><small>Credit: ${prod.credit}</small>
              <br><small>Quantity: ${prod.quantity}</small>
              <br><small class="product-category">Category: ${prod.category}</small>
            </div>
            <div class="product-actions">
              <button onclick="editProduct('${doc.id}')">Edit</button>
              <button onclick="deleteProductConfirm('${doc.id}')">Delete</button>
            </div>
          `;
          productsListDiv.appendChild(productDiv);
  
          // Check for low stock (quantity <= 5)
          if (prod.quantity !== undefined && prod.quantity <= 5) {
            const notification = document.createElement('div');
            notification.classList.add('low-stock-notification');
            notification.innerText = `Warning: ${prod.name} is in low stock! (Quantity: ${prod.quantity})`;
            notification.style.color = 'red';
            notification.style.marginTop = '10px';
            productDiv.appendChild(notification);
  
            // Add to low stock messages for alert
            lowStockMessages.push(`${prod.name} (Quantity: ${prod.quantity})`);
          }
        });
  
        // Show alert if there are any low stock products
        if (lowStockMessages.length > 0) {
          alert(`Low Stock Alert!\nThe following products are running low on stock:\n- ${lowStockMessages.join('\n- ')}\nPlease restock soon!`);
        }
        
        // Initialize search filter if there's any existing search term
        searchProducts();
      })
      .catch(err => {
        console.error("Error loading products:", err);
        productsListDiv.innerHTML = "Error loading products.";
      });
  }
  // Search Products Function
  function searchProducts() {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();
      const categoryFilter = document.getElementById('categoryFilter').value;
      
      const productElements = document.querySelectorAll('.product-item');
      
      productElements.forEach(product => {
          const productName = product.getAttribute('data-name');
          const productCategory = product.getAttribute('data-category');
          
          const matchesSearch = productName.includes(searchTerm);
          const matchesCategory = categoryFilter === 'All' || productCategory === categoryFilter;
          
          if (matchesSearch && matchesCategory) {
              product.style.display = 'flex'; // Using flex to maintain layout
          } else {
              product.style.display = 'none';
          }
      });
  }
  
  // Load Sales Graph
  // function loadSalesGraph() {
  //     // Destroy the previous chart instance if it exists to avoid canvas reuse issues
  //     if (salesChart) {
  //         salesChart.destroy();
  //     }
  
  //     const timeFilter = document.getElementById('timeFilter').value;
  //     const chartType = document.getElementById('chartType').value;
  //     let query = db.collection('orders');
  
  //     // Apply time filter if selected
  //     if (timeFilter !== 'all') {
  //         const now = new Date();
  //         let startDate;
  //         if (timeFilter === '7days') startDate = new Date(now.setDate(now.getDate() - 7));
  //         else if (timeFilter === '30days') startDate = new Date(now.setDate(now.getDate() - 30));
  //         query = query.where('orderDate', '>=', startDate);
  //     }
  
  //     query.get()
  //         .then(snapshot => {
  //             if (snapshot.empty) {
  //                 document.getElementById('salesChart').style.display = 'none';
  //                 const ctx = document.getElementById('salesChart').getContext('2d');
  //                 ctx.font = '16px Poppins';
  //                 ctx.fillText('No sales data available for this period.', 50, 100);
  //                 return;
  //             }
  
  //             const salesData = {};
  //             snapshot.forEach(doc => {
  //                 const order = doc.data();
  //                 const items = order.items || [];
  //                 items.forEach(item => {
  //                     const productName = item.name;
  //                     const quantity = item.quantity || 0;
  //                     if (salesData[productName]) salesData[productName] += quantity;
  //                     else salesData[productName] = quantity;
  //                 });
  //             });
  
  //             const productNames = Object.keys(salesData);
  //             const quantitiesSold = Object.values(salesData);
  
  //             const sortedData = productNames.map((name, index) => ({
  //                 name: name,
  //                 quantity: quantitiesSold[index]
  //             }))
  //             .sort((a, b) => b.quantity - a.quantity)
  //             .slice(0, 10); // Top 10 products
  
  //             const sortedProductNames = sortedData.map(item => item.name);
  //             const sortedQuantities = sortedData.map(item => item.quantity);
  
  //             // Generate random colors for pie chart
  //             const backgroundColors = sortedProductNames.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`);
  //             const borderColors = backgroundColors.map(color => color.replace('0.6', '1'));
  
  //             const ctx = document.getElementById('salesChart').getContext('2d');
  //             salesChart = new Chart(ctx, {
  //                 type: chartType,
  //                 data: {
  //                     labels: sortedProductNames,
  //                     datasets: [{
  //                         label: 'Quantity Sold',
  //                         data: sortedQuantities,
  //                         backgroundColor: chartType === 'pie' ? backgroundColors : 'rgba(54, 162, 235, 0.6)',
  //                         borderColor: chartType === 'pie' ? borderColors : 'rgba(54, 162, 235, 1)',
  //                         borderWidth: 1,
  //                         fill: chartType === 'line' ? false : true
  //                     }]
  //                 },
  //                 options: {
  //                     responsive: true,
  //                     maintainAspectRatio: false,
  //                     scales: chartType === 'pie' ? {} : {
  //                         y: {
  //                             beginAtZero: true,
  //                             title: {
  //                                 display: true,
  //                                 text: 'Quantity Sold',
  //                                 font: { size: 14, family: 'Poppins' }
  //                             },
  //                             ticks: { stepSize: 1, font: { family: 'Poppins' } }
  //                         },
  //                         x: {
  //                             title: {
  //                                 display: true,
  //                                 text: 'Products',
  //                                 font: { size: 14, family: 'Poppins' }
  //                             },
  //                             ticks: { font: { family: 'Poppins' }, maxRotation: 45, minRotation: 45 }
  //                         }
  //                     },
  //                     plugins: {
  //                         legend: { labels: { font: { family: 'Poppins' } } },
  //                         title: {
  //                             display: true,
  //                             text: `Top 10 Most Sold Products (${timeFilter === 'all' ? 'All Time' : timeFilter === '7days' ? 'Last 7 Days' : 'Last 30 Days'})`,
  //                             font: { size: 18, family: 'Poppins' },
  //                             padding: { top: 10, bottom: 30 }
  //                         },
  //                         tooltip: { bodyFont: { family: 'Poppins' }, titleFont: { family: 'Poppins' } }
  //                     }
  //                 }
  //             });
  //         })
  //         .catch(err => {
  //             console.error("Error loading sales data:", err);
  //             const ctx = document.getElementById('salesChart').getContext('2d');
  //             ctx.font = '16px Poppins';
  //             ctx.fillText('Error loading sales data.', 50, 100);
  //         });
  // }
  
  // Add Product Form Event Listener
  document.getElementById('addProductForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const credit = parseFloat(document.getElementById('productCredit').value);
    const quantity = parseInt(document.getElementById('productQuantity').value);
    const category = document.getElementById('productCategory').value;
    const imageName = document.getElementById('productImageName').value;
    
    const imageUrl = `assets/images/${imageName}`;
    
    db.collection('products').add({
        name: name,
        price: price,
        credit: credit,
        quantity: quantity,
        category: category,
        imageUrl: imageUrl
    })
    .then(() => {
        document.getElementById('productMessage').innerText = "Product added successfully!";
        document.getElementById('addProductForm').reset();
        showSection('adminPanel');
    })
    .catch(error => {
        document.getElementById('productMessage').innerText = `Error: ${error.message}`;
    });
  });
  
  // Edit Product
  function editProduct(productId) {
    currentProductId = productId;
    
    db.collection('products').doc(productId).get()
        .then(doc => {
            if (doc.exists) {
                const product = doc.data();
                document.getElementById('updateProductName').value = product.name;
                document.getElementById('updateProductPrice').value = product.price;
                document.getElementById('updateProductCredit').value = product.credit;
                document.getElementById('updateProductQuantity').value = product.quantity;
                document.getElementById('updateProductCategory').value = product.category;
                
                const imageUrl = product.imageUrl || '';
                const imageName = imageUrl.split('/').pop();
                document.getElementById('updateProductImageName').value = imageName;
                
                showSection('updateProductSection');
            } else {
                alert("Product not found.");
            }
        })
        .catch(error => {
            console.error("Error fetching product:", error);
            alert("Error fetching product details.");
        });
  }
  
  // Update Product Form Event Listener
  document.getElementById('updateProductForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!currentProductId) {
        alert("No product selected for update.");
        return;
    }
    
    const name = document.getElementById('updateProductName').value;
    const price = parseFloat(document.getElementById('updateProductPrice').value);
    const credit = parseFloat(document.getElementById('updateProductCredit').value);
    const quantity = parseInt(document.getElementById('updateProductQuantity').value);
    const category = document.getElementById('updateProductCategory').value;
    const imageName = document.getElementById('updateProductImageName').value;
    
    const imageUrl = `assets/images/${imageName}`;
    
    db.collection('products').doc(currentProductId).update({
        name: name,
        price: price,
        credit: credit,
        quantity: quantity,
        category: category,
        imageUrl: imageUrl
    })
    .then(() => {
        alert("Product updated successfully!");
        document.getElementById('updateProductForm').reset();
        showSection('readProductsSection');
        loadProducts();
    })
    .catch(error => {
        alert(`Error updating product: ${error.message}`);
    });
  });
  
  // Delete Product Confirmation
  function deleteProductConfirm(productId) {
    currentProductId = productId;
    
    db.collection('products').doc(productId).get()
        .then(doc => {
            if (doc.exists) {
                const product = doc.data();
                const detailsDiv = document.getElementById('deleteProductDetails');
                detailsDiv.innerHTML = `
                    <p><strong>Name:</strong> ${product.name}</p>
                    <p><strong>Price:</strong> $${product.price}</p>
                    <p><strong>Quantity:</strong> ${product.quantity}</p>
                    <p><strong>Category:</strong> ${product.category}</p>
                `;
                
                showSection('deleteProductSection');
            } else {
                alert("Product not found.");
            }
        })
        .catch(error => {
            console.error("Error fetching product:", error);
            alert("Error fetching product details.");
        });
  }
  
  // Confirm Delete Button Event Listener
  document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
    if (!currentProductId) {
        alert("No product selected for deletion.");
        return;
    }
    
    db.collection('products').doc(currentProductId).delete()
        .then(() => {
            alert("Product deleted successfully!");
            showSection('readProductsSection');
            loadProducts();
        })
        .catch(error => {
            alert(`Error deleting product: ${error.message}`);
        });
  });
  
  // Logout
  function logout() {
    auth.signOut()
        .then(() => {
            currentUser = null;
            window.location.href = "index.html";
        })
        .catch(error => {
            console.error("Error signing out:", error);
        });
  }
  
  // Monitor authentication state
  auth.onAuthStateChanged(user => {
    currentUser = user;
    
    if (user) {
        // Check if the user is an admin
        if (user.email !== "ajay@gmail.com") {
            auth.signOut().then(() => {
                alert("You are not authorized as an admin.");
                window.location.href = "index.html";
            });
        } else {
            // Admin is logged in, show admin panel
            showSection('adminPanel');
        }
    } else {
        // No user logged in, redirect to index.html
        window.location.href = "index.html";
    }
  });
  
  // Initialize event listeners for search functionality once DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
      const searchInput = document.getElementById('searchInput');
      const categoryFilter = document.getElementById('categoryFilter');
      
      if (searchInput) {
          searchInput.addEventListener('keyup', searchProducts);
      }
      
      if (categoryFilter) {
          categoryFilter.addEventListener('change', searchProducts);
      }
  });
  
  
  
  // Load Sales Graph
  function loadSalesGraph() {
      // Destroy the previous chart instance if it exists to avoid canvas reuse issues
      if (salesChart) {
          salesChart.destroy();
      }
    
      const timeFilter = document.getElementById('timeFilter').value;
      const chartType = document.getElementById('chartType').value;
      let query = db.collection('orders');
    
      // Apply time filter if selected
      if (timeFilter !== 'all') {
          const now = new Date();
          let startDate;
          if (timeFilter === '7days') startDate = new Date(now.setDate(now.getDate() - 7));
          else if (timeFilter === '30days') startDate = new Date(now.setDate(now.getDate() - 30));
          query = query.where('orderDate', '>=', startDate);
      }
    
      query.get()
          .then(snapshot => {
              if (snapshot.empty) {
                  document.getElementById('salesChart').style.display = 'none';
                  const ctx = document.getElementById('salesChart').getContext('2d');
                  ctx.font = '16px Poppins';
                  ctx.fillText('No sales data available for this period.', 50, 100);
                  return;
              }
    
              const salesData = {};
              snapshot.forEach(doc => {
                  const order = doc.data();
                  const items = order.items || [];
                  items.forEach(item => {
                      const productName = item.name;
                      const quantity = item.quantity || 0;
                      if (salesData[productName]) salesData[productName] += quantity;
                      else salesData[productName] = quantity;
                  });
              });
    
              const productNames = Object.keys(salesData);
              const quantitiesSold = Object.values(salesData);
    
              const sortedData = productNames.map((name, index) => ({
                  name: name,
                  quantity: quantitiesSold[index]
              }))
              .sort((a, b) => b.quantity - a.quantity)
              .slice(0, 10); // Top 10 products
    
              const sortedProductNames = sortedData.map(item => item.name);
              const sortedQuantities = sortedData.map(item => item.quantity);
    
              // Generate random colors for pie chart
              const backgroundColors = sortedProductNames.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`);
              const borderColors = backgroundColors.map(color => color.replace('0.6', '1'));
    
              const ctx = document.getElementById('salesChart').getContext('2d');
              salesChart = new Chart(ctx, {
                  type: chartType,
                  data: {
                      labels: sortedProductNames,
                      datasets: [{
                          label: 'Quantity Sold',
                          data: sortedQuantities,
                          backgroundColor: chartType === 'pie' ? backgroundColors : 'rgba(54, 162, 235, 0.6)',
                          borderColor: chartType === 'pie' ? borderColors : 'rgba(54, 162, 235, 1)',
                          borderWidth: 1,
                          fill: chartType === 'line' ? false : true
                      }]
                  },
                  options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: chartType === 'pie' ? {} : {
                          y: {
                              beginAtZero: true,
                              title: {
                                  display: true,
                                  text: 'Quantity Sold',
                                  font: { size: 14, family: 'Poppins' }
                              },
                              ticks: { stepSize: 1, font: { family: 'Poppins' } }
                          },
                          x: {
                              title: {
                                  display: true,
                                  text: 'Products',
                                  font: { size: 14, family: 'Poppins' }
                              },
                              ticks: { font: { family: 'Poppins' }, maxRotation: 45, minRotation: 45 }
                          }
                      },
                      plugins: {
                          legend: { labels: { font: { family: 'Poppins' } } },
                          title: {
                              display: true,
                              text: `Top 10 Most Sold Products (${timeFilter === 'all' ? 'All Time' : timeFilter === '7days' ? 'Last 7 Days' : 'Last 30 Days'})`,
                              font: { size: 18, family: 'Poppins' },
                              padding: { top: 10, bottom: 30 }
                          },
                          tooltip: { bodyFont: { family: 'Poppins' }, titleFont: { family: 'Poppins' } }
                      }
                  }
              });
    
              // Add download report button below the chart
              const chartContainer = document.getElementById('salesGraphSection');
              let downloadBtn = document.getElementById('downloadReportBtn');
              if (!downloadBtn) {
                  downloadBtn = document.createElement('button');
                  downloadBtn.id = 'downloadReportBtn';
                  downloadBtn.innerText = 'Download Report';
                  downloadBtn.style.marginTop = '20px';
                  downloadBtn.onclick = () => downloadSalesReport(sortedData, timeFilter);
                  chartContainer.appendChild(downloadBtn);
              }
          })
          .catch(err => {
              console.error("Error loading sales data:", err);
              const ctx = document.getElementById('salesChart').getContext('2d');
              ctx.font = '16px Poppins';
              ctx.fillText('Error loading sales data.', 50, 100);
          });
    }
    
    // Function to generate and download the sales report
    function downloadSalesReport(sortedData, timeFilter) {
      const period = timeFilter === 'all' ? 'All Time' : timeFilter === '7days' ? 'Last 7 Days' : 'Last 30 Days';
      let reportContent = `Sales Report: Top 10 Most Sold Products (${period})\n`;
      reportContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
      reportContent += 'Analysis:\n';
      
      sortedData.forEach((item, index) => {
          reportContent += `${index + 1}. ${item.name}: ${item.quantity} units sold\n`;
      });
    
      // Basic analysis
      const totalUnitsSold = sortedData.reduce((sum, item) => sum + item.quantity, 0);
      reportContent += `\nTotal Units Sold: ${totalUnitsSold}\n`;
      reportContent += `Best Selling Product: ${sortedData[0].name} (${sortedData[0].quantity} units)\n`;
      if (sortedData.length > 1) {
          reportContent += `Least Selling Product (in Top 10): ${sortedData[sortedData.length - 1].name} (${sortedData[sortedData.length - 1].quantity} units)\n`;
      }
    
      // Create a Blob with the report content
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sales_Report_${period.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
    
 