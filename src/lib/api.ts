// Safe API fetch wrapper to support Google Sheets serverless mode (GAS)
// This avoids dangerous global window.fetch override which crashes in sandboxed iframes.

const originalFetch = window.fetch;

export const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input.toString();
  const gasUrl = localStorage.getItem("gas_web_app_url");

  if (gasUrl && url.startsWith("/api/")) {
    const [pathPart, queryPart] = url.split("?");
    const segments = pathPart.replace(/^\/api\//, "").split("/");
    const queryParams = new URLSearchParams(queryPart || "");
    
    let action = "";
    let method = init?.method?.toUpperCase() || "GET";
    let bodyObj: any = {};
    
    if (init?.body) {
      try {
        bodyObj = JSON.parse(init.body as string);
      } catch (e) {
        // Safe fallback
      }
    }

    // Map Express API routes to Google Apps Script actions
    if (segments[0] === "students") {
      if (segments[1] === "login") {
        action = "studentLogin";
        method = "POST";
      } else if (segments[1] && segments[2] === "songs") {
        if (method === "GET") {
          action = "getStudentSongs";
          queryParams.set("maHV", segments[1]);
        } else {
          action = "addStudentSong";
          bodyObj.maHV = segments[1];
        }
      } else if (segments[1] && segments[2] === "details") {
        action = "getStudentDetails";
        queryParams.set("maHV", segments[1]);
      } else if (segments[1]) {
        if (method === "PUT") {
          action = "updateStudent";
          bodyObj.maHV = segments[1];
        } else if (method === "DELETE") {
          action = "deleteStudent";
          bodyObj.maHV = segments[1];
        }
      } else {
        if (method === "GET") {
          action = "getStudents";
        } else {
          action = "addStudent";
        }
      }
    } else if (segments[0] === "classes") {
      if (segments[1]) {
        if (method === "PUT") {
          action = "updateClass";
          bodyObj.maLop = segments[1];
        } else if (method === "DELETE") {
          action = "deleteClass";
          bodyObj.maLop = segments[1];
        }
      } else {
        if (method === "GET") {
          action = "getClasses";
        } else {
          action = "addClass";
        }
      }
    } else if (segments[0] === "songs") {
      if (segments[1]) {
        if (method === "PUT") {
          action = "updateSong";
          bodyObj.maBH = segments[1];
        } else if (method === "DELETE") {
          action = "deleteSong";
          bodyObj.maBH = segments[1];
        }
      } else {
        if (method === "GET") {
          action = "getSongs";
        } else {
          action = "addSong";
        }
      }
    } else if (segments[0] === "teachers") {
      if (segments[1]) {
        if (method === "PUT") {
          action = "updateTeacher";
          bodyObj.maGV = segments[1];
        } else if (method === "DELETE") {
          action = "deleteTeacher";
          bodyObj.maGV = segments[1];
        }
      } else {
        if (method === "GET") {
          action = "getTeachers";
        } else {
          action = "addTeacher";
        }
      }
    } else if (segments[0] === "settings") {
      if (method === "GET") {
        action = "getSettings";
      } else {
        action = "saveSettings";
      }
    } else if (segments[0] === "fees") {
      if (method === "GET") {
        action = "getFees";
      } else {
        action = "addFee";
      }
    } else if (segments[0] === "bookings") {
      if (segments[1]) {
        if (method === "DELETE") {
          action = "deleteBooking";
          bodyObj.maBooking = segments[1];
        }
      } else {
        if (method === "GET") {
          action = "getBookings";
        } else {
          action = "addBooking";
        }
      }
    } else if (segments[0] === "practices") {
      if (method === "GET") {
        action = "getPractices";
        const maHV = queryParams.get("maHV");
        if (maHV) queryParams.set("maHV", maHV);
      } else {
        action = "addPractice";
      }
    } else if (segments[0] === "attendance") {
      if (method === "GET") {
        action = "getAttendance";
      } else {
        action = "toggleAttendance";
      }
    } else if (segments[0] === "sync" && segments[1] === "bulk-import") {
      action = "bulkImport";
    }

    if (action) {
      queryParams.set("action", action);
      const gasRequestUrl = `${gasUrl}?${queryParams.toString()}`;
      
      let gasInit: RequestInit = {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          action,
          ...bodyObj
        })
      };

      if (method === "GET") {
        gasInit = {
          method: "GET",
          mode: "cors"
        };
      }

      try {
        const response = await originalFetch(gasRequestUrl, gasInit);
        if (response.ok) {
          const jsonText = await response.text();
          return new Response(jsonText, {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } else {
          return response;
        }
      } catch (err: any) {
        console.error("GAS Interceptor Fetch Error:", err);
        return new Response(JSON.stringify({ 
          success: false, 
          message: "Lỗi kết nối máy chủ Google Sheet độc lập: " + err.message 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }

  return originalFetch(input, init);
};

// Export as both customFetch and fetch alias for easy importing
export { customFetch as fetch };

/**
 * Strips HTML tags from song lyrics, replacing paragraphs and breaks with newlines
 * and decoding common HTML entities.
 */
export function stripHtmlFromLyrics(html: string): string {
  if (!html) return "";
  
  let text = html;
  
  // Replace <br>, <br/>, <br /> with newline
  text = text.replace(/<br\s*\/?>/gi, "\n");
  
  // Replace </p> or </div> with newline
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<\/div>/gi, "\n");
  
  // Remove any remaining HTML tags (like <p>, <div>, <span>, <b>, <i>, etc.)
  text = text.replace(/<[^>]+>/g, "");
  
  // Decode HTML entities
  const entities: { [key: string]: string } = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'"
  };
  
  text = text.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, (match) => entities[match] || match);
  
  // Normalize consecutive newlines: collapse 3 or more newlines to exactly 2
  text = text.replace(/\n{3,}/g, "\n\n");
  
  return text.trim();
}

