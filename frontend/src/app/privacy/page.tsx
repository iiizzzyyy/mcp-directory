import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - MCP Directory',
  description: 'Privacy policy and data handling practices for the MCP Directory',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Last Updated: May 31, 2025</p>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          MCP Directory ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, 
          use, disclose, and safeguard your information when you visit our website, including any other media form, media channel, 
          mobile website, or mobile application related or connected to the MCP Directory.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the site.
        </p>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
        
        <h3 className="text-xl font-medium mb-3 mt-6">Personal Data</h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          We may collect personal identification information from you in a variety of ways, including, but not limited to, when you:
        </p>
        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
          <li className="mt-2">Register on our site</li>
          <li className="mt-2">Submit an MCP server to our directory</li>
          <li className="mt-2">Subscribe to our newsletter</li>
          <li className="mt-2">Respond to a survey</li>
          <li className="mt-2">Fill out a form</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300">
          The personal information we may collect includes your name, email address, and other contact details.
        </p>
        
        <h3 className="text-xl font-medium mb-3 mt-6">Usage Data</h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          We may also collect information on how the website is accessed and used ("Usage Data"). This Usage Data may include 
          information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, 
          the pages of our website that you visit, the time and date of your visit, the time spent on those pages, unique 
          device identifiers, and other diagnostic data.
        </p>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Use of Your Information</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          We may use the information we collect from you for the following purposes:
        </p>
        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
          <li className="mt-2">To provide and maintain our website</li>
          <li className="mt-2">To notify you about changes to our website</li>
          <li className="mt-2">To allow you to participate in interactive features of our website when you choose to do so</li>
          <li className="mt-2">To provide customer support</li>
          <li className="mt-2">To gather analysis or valuable information so that we can improve our website</li>
          <li className="mt-2">To monitor the usage of our website</li>
          <li className="mt-2">To detect, prevent, and address technical issues</li>
        </ul>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Disclosure of Your Information</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          We may share your information in the following situations:
        </p>
        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
          <li className="mt-2"><strong>With Service Providers:</strong> We may share your information with service providers to monitor and analyze the use of our website and to provide better functionality.</li>
          <li className="mt-2"><strong>For Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
          <li className="mt-2"><strong>With Your Consent:</strong> We may disclose your personal information for any other purpose with your consent.</li>
        </ul>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Security of Your Information</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          We use administrative, technical, and physical security measures to help protect your personal information. 
          While we have taken reasonable steps to secure the personal information you provide to us, please be aware 
          that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission 
          can be guaranteed against any interception or other type of misuse.
        </p>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          If you have questions or comments about this Privacy Policy, please contact us at:
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Email:</strong> privacy@mcpdirectory.example.com
        </p>
      </section>
    </div>
  );
}
