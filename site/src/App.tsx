import { useState, useEffect } from 'react';
import $ from 'jquery';
import { Card, Button, ListGroup, Spinner, Row, Pagination, Badge, Accordion } from 'react-bootstrap';
import { Files, File, Download, Hash, ClockHistory, HeartPulse, Film, FileText, FileImage, FileMusic } from 'react-bootstrap-icons';
import moment from 'moment';
import './App.css';

interface apiResponse {
  added: string,
  files: any[],
  category: string,
  id: string,
  leechers: string,
  imdb: string,
  info_hash: string,
  name: string,
  num_files: string,
  seeders: string,
  size: string,
  status: string,
  username: string
}

const pagesPerPage = 9;

const sendApiRequest = (query: any) => {
  return fetch(`http://localhost:5000/search?query=${query}`)
    .then(response => response.json())
}

const sendDownloadApi = (hash: any, name: any) => {
  return fetch(`http://localhost:5000/download?hash=${hash}&name=${name}`)
    .then(response => response.json())
    .then(console.log)
}

// get date as unix time, Format date using Moment.js
const formatDate = (date: any) => {
  return moment(date).format('DD-MM-YYYY HH:mm:ss');
}

// make byets readable
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const divideListToPages = (list: any[], page: number) => {
  const start = (page - 1) * pagesPerPage;
  const end = start + pagesPerPage;
  return list.slice(start, end);
}
const pickIconByFilename = (filename: string) => {
  const videosExtention = ['mp4', 'avi', 'mkv', 'mov', 'flv', 'wmv', 'mpg', 'mpeg', 'm4v', '3gp', '3g2'];
  const imagesExtention = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'];
  const documentsExtention = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt', 'rtf', 'odt', 'ods', 'odp', 'odg', 'odc', 'odf', 'odb', 'csv'];
  const musicExtention = ['mp3', 'wav', 'wma', 'aac', 'flac', 'ogg', 'm4a'];

  const extentionList = [{ extentions: videosExtention, icon: <Film /> }, { extentions: imagesExtention, icon: <FileImage /> }, { extentions: documentsExtention, icon: <FileText /> }, { extentions: musicExtention, icon: <FileMusic /> }];

  const extention = filename.split('.').slice(-1)[0];
  for (let i = 0; i < extentionList.length; i++) {
    if (extentionList[i].extentions.includes(extention)) {
      return extentionList[i].icon;
    }
  }
  return <File />

}

function App() {
  const [query, setQuery] = useState<any>('');
  const [result, setResult] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTorrent, setSelectedTorrent] = useState<any>();


  useEffect(() => {
    if (query) {
      setIsLoading(true);
      sendApiRequest(query).then(data => {
        setIsLoading(false);
        setResult(data)
        setPage(1);
        setTotalPages(Math.ceil(data.length / 10));
        console.log(data);
      });
    }
  }, [query]);
  let start = (page - 1) * pagesPerPage;
  let end = start + pagesPerPage;
  return (
    <div>
      <input type="text" id="query" />
      {isLoading ? <Button variant="primary" disabled>
        <Spinner
          as="span"
          animation="border"
          size="sm"
          role="status"
          aria-hidden="true" /> Loading...</Button> :
        <Button variant="primary" onClick={() => setQuery($('#query').val())}>Search</Button>}
      <span>Displaying {start}-{end} torrents</span>
      {result.length > 0 && <Pagination>
        <Pagination.First onClick={() => setPage(1)} />
        <Pagination.Prev onClick={() => setPage(page - 1)} />
        {Array.from({ length: totalPages }, (_, i) =>
          <Pagination.Item key={i} onClick={() => setPage(i + 1)} active={i + 1 === page}>{i + 1}</Pagination.Item>
        )}
        <Pagination.Next onClick={() => setPage(page + 1)} />
        <Pagination.Last onClick={() => setPage(totalPages)} />
      </Pagination>}
      <Row>
        {divideListToPages(result, page).map((item: apiResponse) => {
          return <Card onClick={() => setSelectedTorrent(selectedTorrent !== item.id ? item.id : '')} className={selectedTorrent === item.id ? "selectedCard" : "card"}>
            <Card.Body>
              <Card.Title >{item.name}</Card.Title>
              <hr />
              <ListGroup>
                <ListGroup.Item><ClockHistory /> {formatDate(+item.added * 1000)}</ListGroup.Item>
                <ListGroup.Item><Download /> {formatBytes(+item.size)} {+item.num_files > 1 && `(${formatBytes(+item.size / +item.num_files)} / file)`}</ListGroup.Item>
                <ListGroup.Item><Files /> {item.num_files} Files</ListGroup.Item>
                <ListGroup.Item>
                  <Accordion activeKey={selectedTorrent === item.id ? "0" : ""} flush>
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>Files:</Accordion.Header>
                      <Accordion.Body>
                        {item.files.map((file: any) => {
                          return <>{pickIconByFilename(file.name[0])} <span key={file.name[0]} className="elipsis">{file.name[0]}</span><hr /></>
                        })}
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </ListGroup.Item>
                <ListGroup.Item><HeartPulse></HeartPulse> {item.seeders} / {item.leechers}</ListGroup.Item>
                <ListGroup.Item><Hash></Hash> {item.info_hash}</ListGroup.Item>
              </ListGroup>
              {selectedTorrent === item.id ? <><hr /><Button variant="success" onClick={() => sendDownloadApi(item.info_hash, item.name)}><Download /> Download</Button></> : null}
            </Card.Body>
          </Card>
        })
        }
      </Row>
    </div>
  );
}

export default App;
