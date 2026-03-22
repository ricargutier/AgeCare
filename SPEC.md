# AgeCare - Login Page Specification

## 1. Project Overview

- **Project Name:** AgeCare Login Page
- **Type:** Single-page web application (authentication UI)
- **Core Functionality:** A secure, accessible login interface for the AgeCare healthcare management system
- **Target Users:** Healthcare staff, administrators, and caregivers

## 2. UI/UX Specification

### Layout Structure

- **Container:** Centered card layout (max-width: 420px)
- **Page Background:** Soft gradient with subtle pattern
- **Card Structure:**
  - Logo/brand area (top)
  - Welcome message
  - Form fields (centered)
  - Action buttons
  - Footer links (below form)

### Visual Design

**Color Palette:**
- Primary: `#2D6A4F` (Deep forest green - trust, health)
- Primary Light: `#40916C`
- Primary Dark: `#1B4332`
- Accent: `#95D5B2` (Soft mint)
- Background: `#F8F9FA` (Off-white)
- Card Background: `#FFFFFF`
- Text Primary: `#1B4332`
- Text Secondary: `#6C757D`
- Error: `#DC3545`
- Input Border: `#CED4DA`
- Input Focus: `#2D6A4F`

**Typography:**
- Font Family: 'DM Sans' (headings), 'Nunito' (body)
- Heading (h1): 28px, font-weight 700
- Subheading: 16px, font-weight 400
- Labels: 14px, font-weight 600
- Inputs: 16px
- Buttons: 16px, font-weight 600

**Spacing:**
- Card padding: 48px
- Field spacing: 24px
- Button margin-top: 16px

**Visual Effects:**
- Card shadow: `0 8px 32px rgba(45, 106, 79, 0.12)`
- Input focus: 3px ring with primary color at 20% opacity
- Button hover: slight lift with shadow
- Background: Subtle health-related pattern overlay

### Components

**1. Logo/Brand Area**
- AgeCare text logo with heart care icon
- Tagline: "Caring with Compassion"

**2. Welcome Section**
- Heading: "Welcome Back"
- Subtext: "Sign in to access your dashboard"

**3. Form Fields**
- Email input (type: email, required)
  - Placeholder: "Enter your email"
  - Icon: envelope
- Password input (type: password, required)
  - Placeholder: "Enter your password"
  - Icon: lock
  - Show/hide password toggle
- Remember me checkbox
- Forgot password link

**4. Action Buttons**
- Primary: "Sign In" (full width)
- Secondary: "Create Account" (full width, outline style)

**5. Footer**
- Copyright text
- Privacy Policy | Terms of Service links

### Interactive Behaviors

- **Input Focus:** Border color changes to primary, subtle glow
- **Button Hover:** Scale(1.02), enhanced shadow
- **Button Active:** Scale(0.98)
- **Error State:** Red border, error message below field
- **Loading State:** Button shows spinner, disabled

## 3. Functionality Specification

### Core Features

1. **Email Input**
   - Validation: proper email format
   - Visual feedback on invalid input
   
2. **Password Input**
   - Show/hide toggle
   - Minimum 6 characters validation
   
3. **Remember Me**
   - Checkbox to persist session (visual only for this spec)
   
4. **Form Submission**
   - Validate all fields before submission
   - Show loading state during submission
   - Display error messages for invalid credentials
   - Redirect to dashboard on success (simulated)

5. **Create Account Link**
   - Navigate to registration page (placeholder link)

6. **Forgot Password**
   - Navigate to password recovery (placeholder link)

### User Interactions

- Tab navigation through form fields
- Enter key submits form
- Click outside closes any open dropdowns

### Edge Cases

- Empty field submission → show "required" errors
- Invalid email format → show format error
- Network error simulation → show retry message

## 4. Acceptance Criteria

- [ ] Page loads with centered login card on gradient background
- [ ] Logo displays with "AgeCare" branding
- [ ] Email and password fields are functional with icons
- [ ] Password visibility toggle works
- [ ] Form validation displays errors for empty/invalid input
- [ ] Sign In button shows loading state on click
- [ ] Remember me checkbox is interactive
- [ ] "Create Account" and "Forgot Password" links are present
- [ ] Responsive: works on mobile (320px+)
- [ ] All animations are smooth (60fps)
