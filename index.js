const request = require('request');
const aws = require('aws-sdk');

const { ToAddress, Source, SourceArn } = process.env;

const doReq = () => new Promise((resolve, reject) => {
  const options = {
    url: 'https://www.amazon.jobs/es/search.json?base_query=&business_category[]=amazon-web-services&category[]=solutions-architect&city=Madrid&country=ESP&county=Madrid&facets[]=location,business_category,category,schedule_type_id,employee_class,normalized_location,job_function_id&latitude=40.41956&loc_group_id=&loc_query=Madrid%2C+Comunidad+de+Madrid%2C+Espa%C3%B1a&longitude=-3.69196&offset=0&query_options=&radius=24km&region=Community+of+Madrid&result_limit=10&sort=relevant&facets%5B%5D=location,business_category,category,schedule_type_id,employee_class,normalized_location,job_function_id&category%5B%5D=solutions-architect&business_category%5B%5D=amazon-web-services',
  };

  request(options, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      resolve(JSON.parse(body));
    } else {
      console.log('ERROR en la peticion');
      reject(error);
    }
  });
});

const sendEmail = body => new Promise((resolve, reject) => {
  const ses = new aws.SES();

  const params = {
    Destination: {
      ToAddresses: [ToAddress],
    },
    Message: {
      Body: {
        Html: {
          Data: body,
        },
      },
      Subject: {
        Data: 'AWS new Jobs',
      },
    },
    Source,
    SourceArn,
  };
  ses.sendEmail(params, (err) => {
    if (err) {
      console.log(err, err.stack); reject(err);
    } else resolve(); // successful response
  });
});

exports.handler = async () => {
  let msgBody = '';
  try {
    const jobs = await doReq();
    if (jobs.hits) {
      jobs.jobs.forEach((job) => {
        if (job.updated_time.includes('hours') || job.updated_time.includes('minutes') || job.updated_time.includes('seconds')) {
          if (msgBody.length === 0) {
            msgBody += '<h1>New Jobs</h1>';
          }
          msgBody += `<p>
                        <a href="https://www.amazon.jobs${job.job_path}">
                            <strong>${job.title}</strong>
                        </a>
                        <br>
                        <span>${job.description_short}</span>
                    </p><br>`;
        }
      });
    }

    console.log(msgBody);

    if (msgBody.length > 0) {
      await sendEmail(msgBody);
    }
  } catch (e) {
    console.log(e);
  }
};
