/**
 * supabaseClient.js - Initialisation de Supabase
 */

// URL et Clé fournies
const supabaseUrl = 'https://gapclzuljxzfeillsavz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcGNsenVsanh6ZmVpbGxzYXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5OTMyMTUsImV4cCI6MjEwMDU2OTIxNX0.fqgodUYQP1VCuq84OwbG9sQKM5Cm9VVVGlLDD5_Uw0s';

// Création du client Supabase global
window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

