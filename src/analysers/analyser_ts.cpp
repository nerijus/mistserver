#include "analyser_ts.h"
#include "analyser.h"
#include <cstdio>
#include <cstdlib>
#include <fcntl.h>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <map>
#include <mist/bitfields.h>
#include <mist/config.h>
#include <mist/ts_packet.h>
#include <signal.h>
#include <sstream>
#include <string.h>
#include <string>
#include <unistd.h>
#include <mist/defines.h>

tsAnalyser::tsAnalyser(Util::Config config) : analysers(config) {
  upTime = Util::bootSecs();
  pcr = 0;
  bytes = 0;

  detailLevel = detail;
  endTime = 0;
  incorrectPacket = 0;
}

void tsAnalyser::doValidate() {
  long long int finTime = Util::bootSecs();
  fprintf(stdout, "time since boot,time at completion,real time duration of data receival,video duration\n");
  fprintf(stdout, "%lli000,%lli000,%lli000,%li \n", upTime, finTime, finTime - upTime, pcr / 27000);
}

bool tsAnalyser::packetReady() {

  if(incorrectPacket > 5)
  {
    mayExecute = false;
    //FAIL_MSG("too many incorrect ts packets!");
    return false;
  }

  return std::cin.good();
}

int tsAnalyser::doAnalyse() {

  char tsIdentifier = std::cin.peek();
  
  if(tsIdentifier != 0x47)
  {
    incorrectPacket++;
  }

  std::cin.read(packetPtr, 188);
//0x47
  if (std::cin.gcount() != 188) { return 0; }
  bytes += 188;
  if (packet.FromPointer(packetPtr)) {
    if (analyse) {
      if (packet.getUnitStart() && payloads[packet.getPID()] != "") {
        std::cout << printPES(payloads[packet.getPID()], packet.getPID(), detailLevel);
        payloads.erase(packet.getPID());
      }
      if (detailLevel >= 3 || !packet.getPID() || packet.isPMT()) {
        if (packet.getPID() == 0) { ((TS::ProgramAssociationTable *)&packet)->parsePIDs(); }
        std::cout << packet.toPrettyString(0, detailLevel);
      }
      if (packet.getPID() && !packet.isPMT() && (payloads[packet.getPID()].size() || packet.getUnitStart())) {
        payloads[packet.getPID()].append(packet.getPayload(), packet.getPayloadLength());
      }
    }
    if (packet && packet.getAdaptationField() > 1 && packet.hasPCR()) { pcr = packet.getPCR(); }
  }
  if (bytes > 1024) {
    long long int tTime = Util::bootSecs();
    if (validate && tTime - upTime > 5 && tTime - upTime > pcr / 27000000) {
      std::cerr << "data received too slowly" << std::endl;
      return 1;
    }
    bytes = 0;
  }

  return endTime;
}

int main(int argc, char **argv) {
  Util::Config conf = Util::Config(argv[0]);
  analysers::defaultConfig(conf);

  conf.addOption("filter", JSON::fromString("{\"arg\":\"num\", \"short\":\"f\", \"long\":\"filter\", \"default\":0, \"help\":\"Only print info "
                                            "about this tag type (8 = audio, 9 = video, 0 = all)\"}"));

  // override default detail level with specific detail level for TS Analyser.
  conf.addOption("detail", JSON::fromString("{\"long\":\"detail\", \"short\":\"D\", \"arg\":\"num\", \"default\":2, \"help\":\"Detail level of "
                                            "analysis. 1 = PES only, 2 = PAT/PMT (default), 3 = all TS packets, 9 = raw PES packet bytes, 10 = "
                                            "raw TS packet bytes\"}"));

  conf.parseArgs(argc, argv);
  tsAnalyser A(conf);

  A.Run();

  return 0;
}

tsAnalyser::~tsAnalyser() {

  for (std::map<unsigned long long, std::string>::iterator it = payloads.begin(); it != payloads.end(); it++) {
    if (!it->first || it->first == 4096) { continue; }
    std::cout << printPES(it->second, it->first, detailLevel);
  }
}

std::string tsAnalyser::printPES(const std::string &d, unsigned long PID, int detailLevel) {
  unsigned int headSize = 0;
  std::stringstream res;
  bool known = false;
  res << "[PES " << PID << "]";
  if ((d[3] & 0xF0) == 0xE0) {
    res << " [Video " << (int)(d[3] & 0xF) << "]";
    known = true;
  }
  if (!known && (d[3] & 0xE0) == 0xC0) {
    res << " [Audio " << (int)(d[3] & 0x1F) << "]";
    known = true;
  }
  if (!known) { res << " [Unknown stream ID: " << (int)d[3] << "]"; }
  if (d[0] != 0 || d[1] != 0 || d[2] != 1) { res << " [!!! INVALID START CODE: " << (int)d[0] << " " << (int)d[1] << " " << (int)d[2] << " ]"; }
  unsigned int padding = 0;
  if (known) {
    if ((d[6] & 0xC0) != 0x80) { res << " [!INVALID FIRST BITS!]"; }
    if (d[6] & 0x30) { res << " [SCRAMBLED]"; }
    if (d[6] & 0x08) { res << " [Priority]"; }
    if (d[6] & 0x04) { res << " [Aligned]"; }
    if (d[6] & 0x02) { res << " [Copyrighted]"; }
    if (d[6] & 0x01) {
      res << " [Original]";
    } else {
      res << " [Copy]";
    }

    int timeFlags = ((d[7] & 0xC0) >> 6);
    if (timeFlags == 2) { headSize += 5; }
    if (timeFlags == 3) { headSize += 10; }
    if (d[7] & 0x20) {
      res << " [ESCR present, not decoded!]";
      headSize += 6;
    }
    if (d[7] & 0x10) {
      uint32_t es_rate = (Bit::btoh24(d.data() + 9 + headSize) & 0x7FFFFF) >> 1;
      res << " [ESR: " << (es_rate * 50) / 1024 << " KiB/s]";
      headSize += 3;
    }
    if (d[7] & 0x08) {
      res << " [Trick mode present, not decoded!]";
      headSize += 1;
    }
    if (d[7] & 0x04) {
      res << " [Add. copy present, not decoded!]";
      headSize += 1;
    }
    if (d[7] & 0x02) {
      res << " [CRC present, not decoded!]";
      headSize += 2;
    }
    if (d[7] & 0x01) {
      res << " [Extension present, not decoded!]";
      headSize += 0; /// \todo Implement this. Complicated field, bah.
    }
    if (d[8] != headSize) {
      padding = d[8] - headSize;
      res << " [Padding: " << padding << "b]";
    }
    if (timeFlags & 0x02) {
      long long unsigned int time = (((unsigned int)d[9] & 0xE) >> 1);
      time <<= 15;
      time |= ((unsigned int)d[10] << 7) | (((unsigned int)d[11] >> 1) & 0x7F);
      time <<= 15;
      time |= ((unsigned int)d[12] << 7) | (((unsigned int)d[13] >> 1) & 0x7F);
      res << " [PTS " << ((double)time / 90000) << "s]";
    }
    if (timeFlags & 0x01) {
      long long unsigned int time = ((d[14] >> 1) & 0x07);
      time <<= 15;
      time |= ((int)d[15] << 7) | (d[16] >> 1);
      time <<= 15;
      time |= ((int)d[17] << 7) | (d[18] >> 1);
      res << " [DTS " << ((double)time / 90000) << "s]";
    }
  }
  if ((((int)d[4]) << 8 | d[5]) != (d.size() - 6)) { res << " [Size " << (((int)d[4]) << 8 | d[5]) << " => " << (d.size() - 6) << "]"; }
  res << std::endl;

  if (detailLevel == 10) {
    unsigned int counter = 0;
    for (unsigned int i = 9 + headSize + padding; i < d.size(); ++i) {
      if ((i < d.size() - 4) && d[i] == 0 && d[i + 1] == 0 && d[i + 2] == 0 && d[i + 3] == 1) {
        res << std::endl;
        counter = 0;
      }
      res << std::hex << std::setw(2) << std::setfill('0') << (int)(d[i] & 0xff) << " ";
      counter++;
      if ((counter) % 32 == 31) { res << std::endl; }
    }
    res << std::endl;
  }
  return res.str();
}