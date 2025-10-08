-- Insert sample products
INSERT INTO public.products (name, description, price, image, category, stock) VALUES
  ('VIP Pass Card', 'Premium access to exclusive features and content', 99.99, '/vip-pass-card.jpg', 'premium', 100),
  ('Digital Toolkit Bundle', 'Complete collection of digital tools and resources', 149.99, '/toolkit-bundle.jpg', 'bundle', 50),
  ('Abstract Digital Art', 'Unique digital artwork for your collection', 49.99, '/digital-product-abstract.jpg', 'digital-art', 200)
ON CONFLICT DO NOTHING;
